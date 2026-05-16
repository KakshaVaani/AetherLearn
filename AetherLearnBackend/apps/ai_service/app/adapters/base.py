from __future__ import annotations

from abc import ABC, abstractmethod

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
    TranslateLessonInput,
)


class BaseAIAdapter(ABC):
    name: str

    @abstractmethod
    async def health(self) -> RuntimeHealth: ...

    @abstractmethod
    async def analyze_image(self, input: AnalyzeImageInput) -> LessonPack: ...

    @abstractmethod
    async def ask(self, input: AskInput) -> AskAnswer: ...

    @abstractmethod
    async def generate_assignment_draft(
        self, input: GenerateAssignmentDraftInput
    ) -> GenerateAssignmentDraftOutput: ...

    @abstractmethod
    async def generate_from_text(self, input: GenerateFromTextInput) -> LessonPack: ...

    @abstractmethod
    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack: ...

    @abstractmethod
    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack: ...
