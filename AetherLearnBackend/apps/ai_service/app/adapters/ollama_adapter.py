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


class OllamaAdapter(BaseAIAdapter):
    name = "ollama"
    runtime = RuntimeMode.OLLAMA

    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def health(self) -> RuntimeHealth:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
            ok = response.status_code < 500
        except Exception:
            ok = False
        return RuntimeHealth(
            runtime=self.runtime,
            ok=ok,
            model=self.model,
            local_only=True,
            hosted_api_used=False,
            warning=None if ok else "Ollama is not reachable",
        )

    async def analyze_image(self, input: AnalyzeImageInput) -> LessonPack:
        prompt = analyze_image_prompt(str(LessonPack.model_json_schema()))
        payload: dict = {"model": self.model, "prompt": prompt, "stream": False, "format": "json"}
        if input.image_bytes_b64:
            payload["images"] = [input.image_bytes_b64]
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Ollama runtime request failed", {"status": response.status_code}
            )
        pack = validate_lesson_pack(extract_json_object(response.json().get("response", "")))
        pack.trace.runtime = self.runtime
        pack.trace.model = self.model
        pack.trace.local_only = True
        pack.trace.hosted_api_used = False
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
        raise AiRuntimeUnavailableError("Ollama Q&A adapter requires a JSON-capable model prompt")

    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Ollama improve adapter requires a JSON-capable model prompt"
        )

    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Ollama translation adapter requires a JSON-capable model prompt"
        )
