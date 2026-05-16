from __future__ import annotations

import asyncio
from time import perf_counter

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
        return AskAnswer.model_validate(extract_json_object(text))

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
