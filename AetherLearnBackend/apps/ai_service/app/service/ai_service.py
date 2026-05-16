from __future__ import annotations

from shared_schemas import (
    AnalyzeImageInput,
    AskInput,
    GenerateAssignmentDraftInput,
    GenerateFromTextInput,
    ImproveLessonInput,
    TranslateLessonInput,
)

from .runtime_router import RuntimeRouter


class AiService:
    def __init__(self, router: RuntimeRouter) -> None:
        self.router = router

    async def analyze_image(self, payload: AnalyzeImageInput):
        return await self.router.analyze_image(payload)

    async def generate_from_text(self, payload: GenerateFromTextInput):
        return await self.router.generate_from_text(payload)

    async def ask(self, payload: AskInput):
        return await self.router.ask(payload)

    async def generate_assignment_draft(self, payload: GenerateAssignmentDraftInput):
        return await self.router.generate_assignment_draft(payload)

    async def improve_lesson(self, payload: ImproveLessonInput):
        return await self.router.improve_lesson(payload)

    async def translate(self, payload: TranslateLessonInput):
        return await self.router.translate_lesson(payload)
