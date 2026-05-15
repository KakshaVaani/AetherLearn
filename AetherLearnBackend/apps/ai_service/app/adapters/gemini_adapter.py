from __future__ import annotations

import httpx
from shared_schemas import (
    AnalyzeImageInput,
    AskAnswer,
    AskInput,
    GenerateFromTextInput,
    ImproveLessonInput,
    LessonPack,
    RuntimeHealth,
    RuntimeMode,
    TranslateLessonInput,
)
from shared_utils.errors import AiRuntimeUnavailableError

from ..prompts import analyze_image_prompt
from ..validators import extract_json_object, validate_lesson_pack
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
        parts: list[dict] = [{"text": analyze_image_prompt(str(schema_hint))}]
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
        pack = validate_lesson_pack(extract_json_object(text))
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

    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError("Gemini improve adapter is not enabled in this deployment")

    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Gemini translation adapter is not enabled in this deployment"
        )
