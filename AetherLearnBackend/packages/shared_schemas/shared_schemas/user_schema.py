from __future__ import annotations

from enum import StrEnum

from pydantic import Field, field_validator

from .base import AetherBase, Timestamped


class UserRole(StrEnum):
    STUDENT = "student"
    TEACHER = "teacher"
    EDUCATOR = "educator"
    SCHOOL_ADMIN = "school_admin"
    REVIEWER = "reviewer"
    PLATFORM_ADMIN = "platform_admin"


class AccessibilityProfile(AetherBase):
    needs_audio_first: bool = False
    needs_screen_reader_support: bool = False
    needs_simple_language: bool = False
    needs_dyslexia_friendly: bool = False
    needs_local_language: bool = False
    preferred_language: str = "en"
    reading_level: str | None = None
    tts_speed: float = 1.0
    font_scale: float = 1.0
    high_contrast: bool = False
    reduce_motion: bool = False


class TeacherProfile(AetherBase):
    subjects: list[str] = Field(default_factory=list)
    grades: list[str] = Field(default_factory=list)
    verified_educator: bool = False


class EducatorProfile(AetherBase):
    organization: str | None = None
    verification_status: str = "unverified"
    public_name: str | None = None


class SafeUser(Timestamped):
    id: str
    name: str
    email: str
    role: UserRole
    school_ids: list[str] = Field(default_factory=list)
    active_school_id: str | None = None
    preferred_language: str = "en"
    accessibility_profile: AccessibilityProfile = Field(default_factory=AccessibilityProfile)
    teacher_profile: TeacherProfile | None = None
    educator_profile: EducatorProfile | None = None
    active: bool = True
    token_version: int = 1


class UserDocument(SafeUser):
    email_normalized: str
    password_hash: str

    @field_validator("email_normalized")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.strip().lower()
