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


class OllamaAdapter(BaseAIAdapter):
    name = "ollama"
    runtime = RuntimeMode.OLLAMA

    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def _generate_json(self, prompt: str) -> dict:
        payload: dict = {"model": self.model, "prompt": prompt, "stream": False, "format": "json"}
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Ollama runtime request failed", {"status": response.status_code}
            )
        return extract_json_object(response.json().get("response", ""))

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
        payload: dict = {"model": self.model, "prompt": prompt, "stream": False, "format": "json"}
        if input.image_bytes_b64:
            payload["images"] = [input.image_bytes_b64]
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
        if response.status_code >= 400:
            raise AiRuntimeUnavailableError(
                "Ollama runtime request failed", {"status": response.status_code}
            )
        raw_response = response.json().get("response", "")
        try:
            generated_data = extract_json_object(raw_response)
        except AiSchemaInvalidError:
            generated_data = {}
        generated = apply_generation_context(
            generated_data,
            teacher_id=input.teacher_id,
            lesson_id=input.lesson_id,
            settings=input.settings,
            runtime=self.runtime.value,
            model=self.model,
            raw_model_response=raw_response,
        )
        pack = validate_lesson_pack(generated)
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
        return AskAnswer.model_validate(await self._generate_json(prompt))

    async def generate_assignment_draft(
        self, input: GenerateAssignmentDraftInput
    ) -> GenerateAssignmentDraftOutput:
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
        return GenerateAssignmentDraftOutput.model_validate(await self._generate_json(prompt))

    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Ollama improve adapter requires a JSON-capable model prompt"
        )

    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack:
        raise AiRuntimeUnavailableError(
            "Ollama translation adapter requires a JSON-capable model prompt"
        )
