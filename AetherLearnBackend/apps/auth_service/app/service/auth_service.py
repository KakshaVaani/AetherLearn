from __future__ import annotations

from shared_schemas import (
    AuthMeResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    SignupRequest,
)
from shared_utils.errors import UnauthorizedError

from ..repository.refresh_token_repository import RefreshTokenRepository
from ..repository.user_repository import UserRepository
from ..security.password import verify_password
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
