from __future__ import annotations

import secrets

import httpx
from shared_schemas import (
    AuthMeResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    SignupRequest,
    UserRole,
)
from shared_utils.errors import UnauthorizedError, ValidationAppError

from ..repository.refresh_token_repository import RefreshTokenRepository
from ..repository.user_repository import UserRepository
from ..security.password import hash_password, verify_password
from ..security.rate_limit import check_login_rate_limit, reset_login_rate_limit
from ..security.safe_user import to_safe_user
from .token_service import TokenService
from .user_service import UserService


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        refresh_tokens: RefreshTokenRepository,
        token_service: TokenService,
    ) -> None:
        self.users = users
        self.refresh_tokens = refresh_tokens
        self.tokens = token_service
        self.user_service = UserService(users)

    async def signup(self, request: SignupRequest) -> LoginResponse:
        user = await self.user_service.create_user(request)
        tokens = await self.tokens.issue_pair(user)
        return LoginResponse(user=user, tokens=tokens)

    async def login(self, request: LoginRequest) -> LoginResponse:
        check_login_rate_limit(request.email)
        document = await self.users.find_by_email(request.email)
        if not document or not document.get("active", True):
            raise UnauthorizedError("Invalid email or password")
        if not verify_password(request.password, document["passwordHash"]):
            raise UnauthorizedError("Invalid email or password")
        reset_login_rate_limit(request.email)
        user = to_safe_user(document)
        await self.users.update(user.id, {"lastLoginAt": None})
        tokens = await self.tokens.issue_pair(user)
        return LoginResponse(user=user, tokens=tokens)

    async def google_login(
        self,
        *,
        id_token: str,
        role: str,
        allowed_client_ids: list[str],
    ) -> LoginResponse:
        if not allowed_client_ids:
            raise ValidationAppError("Google OAuth is not configured")
        profile = await self._verify_google_id_token(id_token, allowed_client_ids)
        email = str(profile.get("email", "")).strip().lower()
        if not email or profile.get("email_verified") not in {True, "true", "True"}:
            raise UnauthorizedError("Google account email is not verified")
        selected_role = role if role in {UserRole.TEACHER, UserRole.STUDENT} else UserRole.STUDENT
        document = await self.users.find_by_email(email)
        if document and not document.get("active", True):
            raise UnauthorizedError("User account is inactive")
        if not document:
            document = await self.users.create(
                {
                    "name": str(profile.get("name") or email.split("@")[0]),
                    "email": email,
                    "emailNormalized": email,
                    "passwordHash": hash_password(secrets.token_urlsafe(32)),
                    "role": selected_role,
                    "schoolIds": [],
                    "activeSchoolId": None,
                    "preferredLanguage": str(profile.get("locale") or "en")[:8],
                    "accessibilityProfile": {},
                    "teacherProfile": {"subjects": [], "grades": [], "verifiedEducator": False}
                    if selected_role == UserRole.TEACHER
                    else None,
                    "educatorProfile": None,
                    "authProvider": "google",
                    "googleSub": str(profile.get("sub") or ""),
                    "pictureUrl": profile.get("picture"),
                    "active": True,
                    "tokenVersion": 1,
                }
            )
        else:
            await self.users.update(
                document["id"],
                {
                    "authProvider": document.get("authProvider") or "google",
                    "googleSub": str(profile.get("sub") or document.get("googleSub") or ""),
                    "pictureUrl": profile.get("picture") or document.get("pictureUrl"),
                    "lastLoginAt": None,
                },
            )
        user = to_safe_user(document)
        tokens = await self.tokens.issue_pair(user)
        return LoginResponse(user=user, tokens=tokens)

    async def _verify_google_id_token(self, id_token: str, allowed_client_ids: list[str]) -> dict:
        if not id_token:
            raise UnauthorizedError("Google ID token is required")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": id_token},
                )
        except httpx.HTTPError as exc:
            raise UnauthorizedError("Could not verify Google account") from exc
        if response.status_code >= 400:
            raise UnauthorizedError("Invalid Google ID token")
        profile = response.json()
        if profile.get("aud") not in allowed_client_ids:
            raise UnauthorizedError("Google OAuth client mismatch")
        if profile.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
            raise UnauthorizedError("Invalid Google token issuer")
        return profile

    async def refresh(self, request: RefreshRequest) -> LoginResponse:
        payload = await self.tokens.verify_refresh(request.refresh_token)
        await self.refresh_tokens.revoke(payload["refreshTokenId"])
        user = await self.user_service.get_safe_user(payload["sub"])
        if user.token_version != payload.get("tokenVersion"):
            raise UnauthorizedError("Token version is no longer valid")
        tokens = await self.tokens.issue_pair(user)
        return LoginResponse(user=user, tokens=tokens)

    async def me(self, access_token: str) -> AuthMeResponse:
        payload = self.tokens.verify_access(access_token)
        user = await self.user_service.get_safe_user(payload["sub"])
        if user.token_version != payload.get("tokenVersion"):
            raise UnauthorizedError("Token version is no longer valid")
        return AuthMeResponse(user=user)

    async def logout(self, refresh_token: str) -> None:
        payload = await self.tokens.verify_refresh(refresh_token)
        await self.refresh_tokens.revoke(payload["refreshTokenId"])

    async def logout_all(self, user_id: str) -> None:
        await self.refresh_tokens.revoke_all_for_user(user_id)
        user = await self.user_service.get_safe_user(user_id)
        await self.users.update(user.id, {"tokenVersion": user.token_version + 1})
