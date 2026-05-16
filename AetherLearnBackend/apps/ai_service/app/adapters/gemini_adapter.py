from __future__ import annotations

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
