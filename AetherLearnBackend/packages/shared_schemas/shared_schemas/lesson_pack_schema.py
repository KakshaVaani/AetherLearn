from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import Field

from .base import AetherBase, Timestamped, utc_now
from .trace_schema import GemmaTrace, RuntimeMode, SchemaStatus


class LessonStatus(StrEnum):
    DRAFT = "draft"
    GENERATING = "generating"
    GENERATION_FAILED = "generation_failed"
    GENERATED = "generated"
    ASSIGNED = "assigned"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class LessonVisibility(StrEnum):
    PRIVATE = "private"
    CLASS = "class"
    SCHOOL = "school"
    COMMONS = "commons"


class SourceUnderstanding(AetherBase):
    title: str
    observed_text: list[str] = Field(default_factory=list)
    observed_objects: list[str] = Field(default_factory=list)
    inferred_topic: str
    unclear_areas: list[str] = Field(default_factory=list)
    source_language: str = "en"


class TeacherPack(AetherBase):
    lesson_objective: str
    teacher_explanation: str
    board_plan: list[str] = Field(default_factory=list)
    low_resource_activity: str
    worksheet: list[str] = Field(default_factory=list)
    quiz: list[str] = Field(default_factory=list)
    answer_key: list[str] = Field(default_factory=list)
    assessment_questions: list[str] = Field(default_factory=list)
    homework: str
    differentiated_explanations: list[str] = Field(default_factory=list)
    local_language_support: str | None = None
    teacher_review_checklist: list[str] = Field(default_factory=list)


class StudentAccessPack(AetherBase):
    listen_first_audio_script: str
    screen_reader_summary: str
    visual_description: str
    simple_explanation: str
    local_language_explanation: str | None = None
    vocabulary: list[str] = Field(default_factory=list)
    practice_questions: list[str] = Field(default_factory=list)
    hints_answers: list[str] = Field(default_factory=list)
    revision_checklist: list[str] = Field(default_factory=list)
    independence_tips: list[str] = Field(default_factory=list)
    qna_context: str = ""


class ConfidenceNotes(AetherBase):
    overall_confidence: float = Field(ge=0.0, le=1.0)
    notes: list[str] = Field(default_factory=list)
    teacher_review_warnings: list[str] = Field(default_factory=list)


class LessonAccessibilityMetadata(AetherBase):
    audio_first_ready: bool = True
    screen_reader_ready: bool = True
    simple_language_ready: bool = True
    local_language_ready: bool = False
    estimated_listening_minutes: int = 3


class LessonSharingMetadata(AetherBase):
    school_shared_at: datetime | None = None
    commons_submitted_at: datetime | None = None
    commons_published_at: datetime | None = None
    license: str = "CC BY-NC-SA 4.0"
    verified_educator: bool = False


class LessonPack(Timestamped):
    id: str
    schema_version: str = "lesson-pack-v1"
    title: str
    source_understanding: SourceUnderstanding
    teacher_pack: TeacherPack
    student_access_pack: StudentAccessPack
    confidence_notes: ConfidenceNotes
    trace: GemmaTrace
    accessibility: LessonAccessibilityMetadata = Field(default_factory=LessonAccessibilityMetadata)
    sharing: LessonSharingMetadata = Field(default_factory=LessonSharingMetadata)
    visibility: LessonVisibility = LessonVisibility.PRIVATE
    status: LessonStatus = LessonStatus.DRAFT
    version: int = 1
    source_image_metadata: dict[str, str | int | bool] = Field(default_factory=dict)
    created_by: str
    created_by_role: str
    school_id: str | None = None
    classroom_id: str | None = None
    class_subject_id: str | None = None
    language: str = "en"
    subject: str = "General"
    grade_band: str = "unknown"
    tags: list[str] = Field(default_factory=list)
    search_text: str = ""


class LessonVersion(Timestamped):
    id: str
    lesson_id: str
    version: int
    pack: LessonPack
    edited_by: str


class LessonAccessCode(Timestamped):
    id: str
    lesson_id: str
    code: str
    expires_at: datetime
    created_by: str


def fallback_trace(
    runtime: RuntimeMode = RuntimeMode.MOCK, fallback_used: bool = False
) -> GemmaTrace:
    return GemmaTrace(
        runtime=runtime,
        model="mock-deterministic" if runtime == RuntimeMode.MOCK else "unknown",
        local_only=runtime in {RuntimeMode.MOCK, RuntimeMode.OLLAMA, RuntimeMode.LOCAL_HUB},
        hosted_api_used=runtime == RuntimeMode.GEMINI,
        latency_ms=0,
        schema_status=SchemaStatus.FALLBACK if fallback_used else SchemaStatus.PASSED,
        fallback_used=fallback_used,
        generated_at=utc_now(),
    )
