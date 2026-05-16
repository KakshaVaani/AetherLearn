from __future__ import annotations

import asyncio
from time import perf_counter
from typing import Any

import httpx
from shared_schemas import (
    AnalyzeImageInput,
    AskAnswer,
    AskInput,
    GenerateAssignmentDraftInput,
    GenerateAssignmentDraftOutput,
    GenerateFromTextInput,
    ImproveLessonInput,
    LessonPack,
    RuntimeHealth,
    RuntimeMode,
    SourceUnderstanding,
    StudentAccessPack,
    TeacherPack,
    TranslateLessonInput,
)
from shared_utils.errors import AiRuntimeUnavailableError, AiSchemaInvalidError

from ..prompts import (
    analyze_image_prompt,
    source_pack_prompt,
    student_pack_prompt,
    teacher_pack_prompt,
)
from ..validators import (
    apply_generation_context,
    compose_lesson_pack_from_parts,
    extract_json_object,
    repair_source_understanding,
    repair_student_access_pack,
    repair_teacher_pack,
    validate_lesson_pack,
)
from .assignment_draft_repair import (
    mcq_option_repair_prompt,
    needs_mcq_option_repair,
    repair_assignment_draft,
)
from .base import BaseAIAdapter


class GeminiAdapter(BaseAIAdapter):
    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    async def health(self) -> RuntimeHealth:
        return RuntimeHealth(
            runtime=RuntimeMode.GEMINI,
            ok=bool(self.api_key),
            model=self.model,
            local_only=False,
            hosted_api_used=True,
            warning=None if self.api_key else "GEMINI_API_KEY is not configured",
        )

    async def _generate_json_with_repair(self, prompt: str) -> tuple[dict, str]:
        if not self.api_key:
            raise AiRuntimeUnavailableError("Gemini runtime is not configured")
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Gemini runtime request failed", {"status": response.status_code}
            )
        data = response.json()
        raw_response = str(data["candidates"][0]["content"]["parts"][0]["text"])
        try:
            return extract_json_object(raw_response), raw_response
        except AiSchemaInvalidError:
            return {}, raw_response

    async def analyze_image(self, input: AnalyzeImageInput) -> LessonPack:
        if not self.api_key:
            raise AiRuntimeUnavailableError("Gemini runtime is not configured")
        schema_hint = LessonPack.model_json_schema()
        prompt = analyze_image_prompt(str(schema_hint))
        source_text = str(input.settings.get("text", "")).strip()
        settings_hint = {
            "title": input.settings.get("title"),
            "subject": input.settings.get("subject"),
            "gradeBand": input.settings.get("gradeBand"),
            "language": input.settings.get("language"),
        }
        prompt = (
            f"{prompt}\n\nGeneration settings:\n{settings_hint}\n"
            f"Use these metadata values exactly:\n"
            f"- id: {input.lesson_id or 'generate-a-stable-id'}\n"
            f"- createdBy: {input.teacher_id}\n"
            "- createdByRole: teacher"
        )
        if source_text:
            prompt = f"{prompt}\n\nSource text from teacher:\n{source_text}"
        parts: list[dict] = [{"text": prompt}]
        if input.image_bytes_b64 and input.mime_type:
            parts.append(
                {"inline_data": {"mime_type": input.mime_type, "data": input.image_bytes_b64}}
            )
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Gemini runtime request failed", {"status": response.status_code}
            )
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        try:
            generated_data = extract_json_object(text)
        except AiSchemaInvalidError:
            generated_data = {}
        generated = apply_generation_context(
            generated_data,
            teacher_id=input.teacher_id,
            lesson_id=input.lesson_id,
            settings=input.settings,
            runtime=RuntimeMode.GEMINI.value,
            model=self.model,
            raw_model_response=text,
        )
        pack = validate_lesson_pack(generated)
        pack.trace.runtime = RuntimeMode.GEMINI
        pack.trace.model = self.model
        pack.trace.local_only = False
        pack.trace.hosted_api_used = True
        return pack

    async def generate_from_text(self, input: GenerateFromTextInput) -> LessonPack:
        start = perf_counter()
        settings = input.settings | {"text": input.text}
        source_data, source_raw = await self._generate_json_with_repair(
            source_pack_prompt(
                str(SourceUnderstanding.model_json_schema()),
                text=input.text,
                settings=settings,
            )
        )
        source = repair_source_understanding(
            source_data, settings=settings, raw_model_response=source_raw
        )
        source_json = source.model_dump(mode="json", by_alias=True)

        teacher_task = self._generate_json_with_repair(
            teacher_pack_prompt(
                str(TeacherPack.model_json_schema()),
                source_understanding=source_json,
                text=input.text,
                settings=settings,
            )
        )
        student_task = self._generate_json_with_repair(
            student_pack_prompt(
                str(StudentAccessPack.model_json_schema()),
                source_understanding=source_json,
                text=input.text,
                settings=settings,
            )
        )
        (teacher_data, _teacher_raw), (student_data, _student_raw) = await asyncio.gather(
            teacher_task, student_task
        )
        teacher = repair_teacher_pack(
            teacher_data, source_understanding=source, settings=settings
        )
        student = repair_student_access_pack(
            student_data, source_understanding=source, settings=settings
        )
        return compose_lesson_pack_from_parts(
            source_understanding=source,
            teacher_pack=teacher,
            student_access_pack=student,
            teacher_id=input.teacher_id,
            lesson_id=input.lesson_id,
            settings=settings,
            runtime=RuntimeMode.GEMINI.value,
            model=self.model,
            latency_ms=int((perf_counter() - start) * 1000),
        )

    async def ask(self, input: AskInput) -> AskAnswer:
        if not self.api_key:
            raise AiRuntimeUnavailableError("Gemini runtime is not configured")

        prompt = (
            "You are AtherLearn, an accessibility-first education assistant. "
            "Use only the supplied lesson pack. Do not invent facts outside it.\n\n"
            "Create a clear student answer for this request:\n"
            f"{input.question}\n\n"
            "The answer must be complete enough for a student to learn from it directly. "
            "Include a short direct answer, a step-by-step explanation, a simple real-life example "
            "when relevant, key points to remember, and one practice check. "
            "Use clean markdown headings and bullets. Do not include hidden reasoning, draft checks, "
            "JSON field descriptions, or comments about this prompt in the student-facing answer.\n\n"
            "Return JSON only with these fields:\n"
            "{"
            '"answer": "well-structured markdown answer", '
            '"simple_answer": "short plain-language version", '
            '"confidence": 0.0, '
            '"follow_up_suggestion": "one useful next step", '
            '"source_limited": true'
            "}\n\n"
            f"Student profile: {input.student_profile}\n"
            f"Lesson pack: {input.lesson_pack.model_dump(mode='json', by_alias=True)}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Gemini Q&A request failed", {"status": response.status_code}
            )
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        try:
            raw_answer = extract_json_object(text)
        except AiSchemaInvalidError:
            raw_answer = {"answer": _clean_raw_ask_text(text)}
        return AskAnswer.model_validate(_normalize_ask_answer(raw_answer))

    async def generate_assignment_draft(
        self, input: GenerateAssignmentDraftInput
    ) -> GenerateAssignmentDraftOutput:
        if not self.api_key:
            raise AiRuntimeUnavailableError("Gemini runtime is not configured")
        question_type = input.question_type
        question_guidance = {
            "mcq": (
                "Generate multiple-choice questions only. Each question must include exactly "
                "four plausible options derived from the lesson."
            ),
            "short_answer": (
                "Generate short-answer questions only. Prompts should be answerable in "
                "one or two concise sentences and options must be empty arrays."
            ),
            "long_answer": (
                "Generate long-answer questions only. Prompts should ask for paragraph "
                "responses with supporting details, and options must be empty arrays."
            ),
        }[question_type]

        prompt = (
            "Create a classroom assignment draft using only this lesson pack. "
            "Do not invent facts outside the lesson source.\n\n"
            "Return JSON only with fields:\n"
            "{"
            '"title": string, '
            '"instructions": string, '
            f'"answer_mode": "{question_type}", '
            '"versions": string[], '
            '"questions": [{"id": string, "prompt": string, "hint": string|null, "options": string[]}]'
            "}\n\n"
            "Use concise, student-friendly wording.\n"
            f"Question type: {question_type}\n"
            f"{question_guidance}\n"
            f"Classroom: {input.classroom_name or 'Classroom'}\n"
            f"Grade: {input.grade or 'Unknown'}\n"
            f"Subject: {input.subject or 'General'}\n"
            f"Preferred versions: {input.preferred_versions}\n"
            f"Lesson pack: {input.lesson_pack.model_dump(mode='json', by_alias=True)}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Gemini assignment generation failed", {"status": response.status_code}
            )
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        draft = GenerateAssignmentDraftOutput.model_validate(extract_json_object(text))
        draft = draft.model_copy(update={"answer_mode": question_type})
        if needs_mcq_option_repair(draft):
            repaired_data, _ = await self._generate_json_with_repair(
                mcq_option_repair_prompt(input, draft)
            )
            draft = GenerateAssignmentDraftOutput.model_validate(repaired_data or draft)
        return repair_assignment_draft(input, draft)

    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError("Gemini improve adapter is not enabled in this deployment")

    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Gemini translation adapter is not enabled in this deployment"
        )


def _normalize_ask_answer(raw: dict[str, Any]) -> dict[str, Any]:
    answer = _clean_raw_ask_text(
        str(raw.get("answer") or raw.get("text") or raw.get("response") or "").strip()
    )
    simple = str(
        raw.get("simple_answer")
        or raw.get("simpleAnswer")
        or raw.get("summary")
        or answer
    ).strip()
    follow_up = str(
        raw.get("follow_up_suggestion")
        or raw.get("followUpSuggestion")
        or raw.get("next_step")
        or raw.get("nextStep")
        or "Review the answer, then try one practice question from the lesson."
    ).strip()
    try:
        confidence = float(raw.get("confidence", 0.82))
    except (TypeError, ValueError):
        confidence = 0.82
    confidence = max(0.0, min(1.0, confidence))

    return {
        "answer": answer or simple or "I could not generate a complete answer from the model response.",
        "simple_answer": simple or answer,
        "confidence": confidence,
        "follow_up_suggestion": follow_up,
        "source_limited": bool(raw.get("source_limited", raw.get("sourceLimited", True))),
    }


def _clean_raw_ask_text(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        return cleaned

    preferred_markers = [
        "# Understanding",
        "# What is",
        "### Direct Explanation",
        "**Direct Answer**",
        "*   *Direct Answer:*",
    ]
    marker_positions = [cleaned.rfind(marker) for marker in preferred_markers]
    marker_positions = [position for position in marker_positions if position >= 0]
    if marker_positions:
        cleaned = cleaned[max(marker_positions):].strip()

    blocked_fragments = [
        "AtherLearn (accessibility-first education assistant)",
        "`answer`",
        "`simple_answer`",
        "`confidence`",
        "`follow_up_suggestion`",
        "`source_limited`",
        "(Self-Correction",
        "(Final check",
        "Final check:",
        "Self-Correction",
        "Refining the Markdown",
        "Wait, the prompt says",
        "JSON format ready",
        "Check:",
        "*Check:",
        "Did I invent facts",
        "Is it valid JSON",
    ]
    kept_lines: list[str] = []
    for line in cleaned.splitlines():
        stripped = line.strip()
        if not stripped:
            kept_lines.append("")
            continue
        if any(fragment in stripped for fragment in blocked_fragments):
            continue
        kept_lines.append(line.rstrip())

    cleaned = "\n".join(kept_lines).strip()
    while "\n\n\n" in cleaned:
        cleaned = cleaned.replace("\n\n\n", "\n\n")
    return cleaned
