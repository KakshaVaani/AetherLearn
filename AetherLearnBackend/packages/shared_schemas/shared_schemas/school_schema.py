from __future__ import annotations

from datetime import datetime

from pydantic import Field

from .base import AetherBase, Timestamped


class School(Timestamped):
    id: str
    name: str
    district: str | None = None
    state: str | None = None
    country: str = "IN"
    admin_ids: list[str] = Field(default_factory=list)


class CreateSchoolRequest(AetherBase):
    name: str = Field(min_length=2, max_length=160)
    district: str | None = None
    state: str | None = None
    country: str = "IN"


class Classroom(Timestamped):
    id: str
    school_id: str
    name: str
    grade: str
    section: str | None = None
    created_by: str
    teacher_ids: list[str] = Field(default_factory=list)
    join_code: str | None = None


class CreateClassroomRequest(AetherBase):
    school_id: str
    name: str = Field(min_length=1, max_length=120)
    grade: str
    section: str | None = None
    subject: str | None = None
    subjects: list[str] = Field(default_factory=list)


class ClassSubject(Timestamped):
    id: str
    school_id: str
    classroom_id: str
    subject: str
    teacher_id: str


class Enrollment(Timestamped):
    id: str
    school_id: str
    classroom_id: str
    student_id: str
    status: str = "active"


class JoinClassRequest(AetherBase):
    code: str = Field(min_length=4, max_length=24)


class JoinCodeResponse(AetherBase):
    classroom_id: str
    code: str
    expires_at: datetime
