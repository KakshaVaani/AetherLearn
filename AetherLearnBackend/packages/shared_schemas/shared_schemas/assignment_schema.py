from __future__ import annotations

from pydantic import Field

from .base import AetherBase, Timestamped
from .lesson_pack_schema import LessonPack


class CreateAssignmentRequest(AetherBase):
    lesson_id: str
    classroom_id: str | None = None
    student_ids: list[str] = Field(default_factory=list)
    due_at: str | None = None
    instructions: str | None = None


class BulkAssignmentRequest(AetherBase):
    assignments: list[CreateAssignmentRequest]


class Assignment(Timestamped):
    id: str
    lesson_id: str
    teacher_id: str
    student_id: str | None = None
    classroom_id: str | None = None
    status: str = "assigned"
    due_at: str | None = None
    homework_access_code: str | None = None


class AssignmentProgress(Timestamped):
    id: str
    assignment_id: str | None = None
    lesson_id: str
    student_id: str
    opened: bool = False
    listened: bool = False
    practiced: bool = False
    asked_question: bool = False
    downloaded: bool = False
    completed: bool = False
    last_position: int = 0
    score: float | None = None
    correct_count: int | None = None
    total_questions: int | None = None
    weak_topics: list[str] = Field(default_factory=list)
    submitted_at: str | None = None
    answers: dict[str, str] = Field(default_factory=dict)


class SubmitAssignmentRequest(AetherBase):
    answers: dict[str, str] = Field(default_factory=dict)
    score: float = Field(ge=0, le=100)
    correct_count: int = Field(default=0, ge=0)
    total_questions: int = Field(default=0, ge=0)
    weak_topics: list[str] = Field(default_factory=list)
    submitted_at: str | None = None


class StudentLessonView(AetherBase):
    lesson: LessonPack
    assignment: Assignment | None = None
    progress: AssignmentProgress | None = None


class TeacherAssignmentSummary(AetherBase):
    lesson_id: str
    assigned_count: int
    completed_count: int
    average_score: float | None = None
