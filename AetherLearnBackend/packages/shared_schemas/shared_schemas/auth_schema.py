from __future__ import annotations

from pydantic import Field, field_validator

from .base import AetherBase
from .user_schema import AccessibilityProfile, SafeUser, UserRole


class SignupRequest(AetherBase):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=256)
    role: UserRole
    preferred_language: str = "en"
    accessibility_profile: AccessibilityProfile = Field(default_factory=AccessibilityProfile)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("email must contain @")
        return value


class LoginRequest(AetherBase):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RefreshRequest(AetherBase):
    refresh_token: str


class TokenPair(AetherBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(AetherBase):
    user: SafeUser
    tokens: TokenPair


class AuthMeResponse(AetherBase):
    user: SafeUser
