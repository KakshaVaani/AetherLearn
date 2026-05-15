from __future__ import annotations

from pydantic import Field

from .base import AetherBase, JsonDict
from .lesson_pack_schema import LessonPack


class AnalyzeImageInput(AetherBase):
    image_bytes_b64: str | None = None
    mime_type: str | None = None
    settings: JsonDict = Field(default_factory=dict)
    teacher_id: str
    lesson_id: str | None = None


class GenerateFromTextInput(AetherBase):
    text: str
    settings: JsonDict = Field(default_factory=dict)
    teacher_id: str
    lesson_id: str | None = None


class AskInput(AetherBase):
    lesson_pack: LessonPack
    question: str
    student_profile: JsonDict = Field(default_factory=dict)


class AskAnswer(AetherBase):
    answer: str
    simple_answer: str
    confidence: float = Field(ge=0.0, le=1.0)
    follow_up_suggestion: str
    source_limited: bool = True


class ImproveLessonInput(AetherBase):
    lesson_pack: LessonPack
    instruction: str


class TranslateLessonInput(AetherBase):
    lesson_pack: LessonPack
    target_language: str
