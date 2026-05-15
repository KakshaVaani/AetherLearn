from __future__ import annotations

from typing import Any

from shared_schemas import SafeUser, SignupRequest
from shared_utils.errors import NotFoundError, ValidationAppError

from ..repository.user_repository import UserRepository
from ..security.password import hash_password
from ..security.safe_user import to_safe_user


class UserService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    async def create_user(self, request: SignupRequest) -> SafeUser:
        existing = await self.users.find_by_email(request.email)
        if existing:
            raise ValidationAppError("Email already registered")
        document: dict[str, Any] = {
            "name": request.name,
            "email": request.email,
            "emailNormalized": request.email.strip().lower(),
            "passwordHash": hash_password(request.password),
            "role": request.role,
            "schoolIds": [],
            "activeSchoolId": None,
            "preferredLanguage": request.preferred_language,
            "accessibilityProfile": request.accessibility_profile.model_dump(by_alias=True),
            "teacherProfile": {"subjects": [], "grades": [], "verifiedEducator": False}
            if request.role in {"teacher", "educator"}
            else None,
            "educatorProfile": None,
            "active": True,
            "tokenVersion": 1,
        }
        created = await self.users.create(document)
        return to_safe_user(created)

    async def get_safe_user(self, user_id: str) -> SafeUser:
        document = await self.users.get(user_id)
        if not document:
            raise NotFoundError("User not found")
        return to_safe_user(document)
