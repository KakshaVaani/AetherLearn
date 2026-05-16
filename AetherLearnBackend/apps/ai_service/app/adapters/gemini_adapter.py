from __future__ import annotations

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
    TranslateLessonInput,
)
from shared_utils.errors import AiRuntimeUnavailableError, AiSchemaInvalidError

from ..prompts import analyze_image_prompt
from ..validators import apply_generation_context, extract_json_object, validate_lesson_pack
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
        return await self.analyze_image(
            AnalyzeImageInput(
                settings=input.settings | {"text": input.text},
                teacher_id=input.teacher_id,
                lesson_id=input.lesson_id,
            )
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

        prompt = (
            "Create a classroom assignment draft using only this lesson pack. "
            "Do not invent facts outside the lesson source.\n\n"
            "Return JSON only with fields:\n"
            "{"
            '"title": string, '
            '"instructions": string, '
            '"answer_mode": "text", '
            '"versions": string[], '
            '"questions": [{"id": string, "prompt": string, "hint": string|null, "options": string[]}]'
            "}\n\n"
            "Use concise, student-friendly wording. Prefer text answers.\n"
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
        return GenerateAssignmentDraftOutput.model_validate(extract_json_object(text))

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
