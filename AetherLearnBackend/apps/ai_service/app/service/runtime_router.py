from __future__ import annotations

from shared_schemas import (
    AnalyzeImageInput,
    AskInput,
    GenerateAssignmentDraftInput,
    GenerateFromTextInput,
    ImproveLessonInput,
    LessonPack,
    RuntimeMode,
    SchemaStatus,
    TraceWarning,
    TranslateLessonInput,
)
from shared_utils.errors import AiRuntimeUnavailableError

from ..adapters import GeminiAdapter, LocalHubAdapter, MockAdapter, OllamaAdapter
from ..env import Settings


class RuntimeRouter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.mock = MockAdapter()

    def _assert_required_generation_model(self, selected) -> None:
        if not self.settings.enforce_gemma_model:
            return
        runtime = getattr(selected, "runtime", None)
        model = str(getattr(selected, "model", ""))
        allowed_runtimes = {RuntimeMode.OLLAMA, RuntimeMode.LOCAL_HUB}
        if runtime not in allowed_runtimes:
            raise AiRuntimeUnavailableError(
                "AI runtime must be ollama/local-hub for generation",
                {"runtime": str(runtime), "model": model},
            )
        if model != self.settings.required_gemma_model:
            raise AiRuntimeUnavailableError(
                "AI model mismatch for generation",
                {"expected": self.settings.required_gemma_model, "actual": model},
            )

    async def adapter(self):
        runtime = self.settings.ai_runtime
        if self.settings.use_mock or runtime == "mock":
            return self.mock
        if runtime == "gemini":
            return GeminiAdapter(self.settings.gemini_api_key, self.settings.gemini_model)
        if runtime == "ollama":
            return OllamaAdapter(self.settings.ollama_base_url, self.settings.ollama_model)
        if runtime == "local-hub":
            return LocalHubAdapter(self.settings.ollama_base_url, self.settings.ollama_model)
        if runtime == "auto":
            candidates = []
            if self.settings.school_hub_mode:
                candidates.append(
                    LocalHubAdapter(self.settings.ollama_base_url, self.settings.ollama_model)
                )
            if self.settings.gemini_api_key:
                candidates.append(
                    GeminiAdapter(self.settings.gemini_api_key, self.settings.gemini_model)
                )
            candidates.append(
                OllamaAdapter(self.settings.ollama_base_url, self.settings.ollama_model)
            )
            if self.settings.allow_runtime_fallback or self.settings.app_env == "development":
                candidates.append(self.mock)
            for candidate in candidates:
                if (await candidate.health()).ok:
                    return candidate
        raise AiRuntimeUnavailableError("No AI runtime is available")

    async def analyze_image(self, input: AnalyzeImageInput) -> LessonPack:
        selected = await self.adapter()
        self._assert_required_generation_model(selected)
        try:
            return await selected.analyze_image(input)
        except Exception as exc:
            if not self.settings.allow_runtime_fallback:
                raise
            pack = await self.mock.analyze_image(input)
            pack.trace.fallback_used = True
            pack.trace.schema_status = SchemaStatus.FALLBACK
            pack.trace.warnings.append(
                TraceWarning(
                    code="RUNTIME_FALLBACK",
                    message=f"{selected.name} failed; deterministic mock fallback used.",
                    severity="warning",
                )
            )
            pack.confidence_notes.teacher_review_warnings.append(
                f"Runtime fallback used after {selected.name} failed: {exc.__class__.__name__}."
            )
            return pack

    async def generate_from_text(self, input: GenerateFromTextInput) -> LessonPack:
        selected = await self.adapter()
        self._assert_required_generation_model(selected)
        try:
            return await selected.generate_from_text(input)
        except Exception:
            if not self.settings.allow_runtime_fallback:
                raise
            pack = await self.mock.generate_from_text(input)
            pack.trace.fallback_used = True
            pack.trace.schema_status = SchemaStatus.FALLBACK
            return pack

    async def ask(self, input: AskInput):
        selected = await self.adapter()
        self._assert_required_generation_model(selected)
        try:
            return await selected.ask(input)
        except Exception:
            if not self.settings.allow_runtime_fallback:
                raise
            return await self.mock.ask(input)

    async def generate_assignment_draft(self, input: GenerateAssignmentDraftInput):
        selected = await self.adapter()
        self._assert_required_generation_model(selected)
        try:
            return await selected.generate_assignment_draft(input)
        except Exception:
            if not self.settings.allow_runtime_fallback:
                raise
            return await self.mock.generate_assignment_draft(input)

    async def improve_lesson(self, input: ImproveLessonInput):
        return await (await self.adapter()).improve_lesson(input)

    async def translate_lesson(self, input: TranslateLessonInput):
        return await (await self.adapter()).translate_lesson(input)

    async def status(self) -> dict:
        adapter = await self.adapter()
        health = await adapter.health()
        return health.model_dump(mode="json", by_alias=True)
