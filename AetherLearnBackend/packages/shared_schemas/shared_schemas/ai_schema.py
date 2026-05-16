from __future__ import annotations

from pydantic import Field, field_validator

from .assignment_schema import (
    AssignmentAnswerMode,
    AssignmentQuestion,
    normalize_assignment_answer_mode,
)
from .base import AetherBase, JsonDict
from .lesson_pack_schema import LessonPack, SourceUnderstanding, StudentAccessPack, TeacherPack


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


class GenerateAssignmentDraftInput(AetherBase):
    lesson_pack: LessonPack
    classroom_name: str | None = None
    grade: str | None = None
    subject: str | None = None
    preferred_versions: list[str] = Field(default_factory=list)
    question_type: AssignmentAnswerMode = "short_answer"

    @field_validator("question_type", mode="before")
    @classmethod
    def _normalize_question_type(cls, value: object) -> AssignmentAnswerMode:
        return normalize_assignment_answer_mode(value)


class GenerateAssignmentDraftOutput(AetherBase):
    title: str
    instructions: str
    answer_mode: AssignmentAnswerMode = "short_answer"
    versions: list[str] = Field(default_factory=list)
    questions: list[AssignmentQuestion] = Field(default_factory=list)

    @field_validator("answer_mode", mode="before")
    @classmethod
    def _normalize_answer_mode(cls, value: object) -> AssignmentAnswerMode:
        return normalize_assignment_answer_mode(value)


class GenerateSourcePackOutput(AetherBase):
    source_understanding: SourceUnderstanding


class GenerateTeacherPackOutput(AetherBase):
    teacher_pack: TeacherPack


class GenerateStudentPackOutput(AetherBase):
    student_access_pack: StudentAccessPack


class ImproveLessonInput(AetherBase):
    lesson_pack: LessonPack
    instruction: str


class TranslateLessonInput(AetherBase):
    lesson_pack: LessonPack
    target_language: str
