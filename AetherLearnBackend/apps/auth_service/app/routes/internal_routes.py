from __future__ import annotations

from fastapi import APIRouter, Header, Request
from service_auth import UserContext
from service_auth.service_tokens import verify_internal_request_from_headers
from shared_schemas import LoginRequest, RefreshRequest, SignupRequest
from shared_utils.errors import ForbiddenError, ValidationAppError
from shared_utils.mongo_repository import repository_for

from ..env import Settings, get_settings
from ..repository.refresh_token_repository import RefreshTokenRepository
from ..repository.user_repository import UserRepository
from ..service.auth_service import AuthService
from ..service.token_service import TokenService

router = APIRouter(prefix="/internal/auth", tags=["internal-auth"])


async def require_service(request: Request) -> None:
    settings = get_settings()
    await verify_internal_request_from_headers(request, settings.internal_service_secret)


def build_auth_service(request: Request, settings: Settings | None = None) -> AuthService:
    settings = settings or get_settings()
    users = UserRepository(repository_for(request.app.state.mongo, "users", settings.mongodb_uri))
    refresh = RefreshTokenRepository(
        repository_for(request.app.state.mongo, "refresh_tokens", settings.mongodb_uri)
    )
    tokens = TokenService(
        refresh,
        settings.jwt_access_secret,
        settings.jwt_refresh_secret,
        settings.access_token_ttl_minutes,
        settings.refresh_token_ttl_days,
    )
    return AuthService(users, refresh, tokens)


@router.post("/signup")
async def signup(request: Request, payload: SignupRequest):
    await require_service(request)
    return await build_auth_service(request).signup(payload)


@router.post("/login")
async def login(request: Request, payload: LoginRequest):
    await require_service(request)
    return await build_auth_service(request).login(payload)


@router.post("/refresh")
async def refresh(request: Request, payload: RefreshRequest):
    await require_service(request)
    return await build_auth_service(request).refresh(payload)


@router.post("/logout")
async def logout(request: Request, payload: RefreshRequest):
    await require_service(request)
    await build_auth_service(request).logout(payload.refresh_token)
    return {"ok": True}


@router.post("/logout-all")
async def logout_all(request: Request, payload: dict):
    await require_service(request)
    await build_auth_service(request).logout_all(str(payload["userId"]))
    return {"ok": True}


@router.get("/me")
async def me(request: Request, authorization: str = Header(default="")):
    await require_service(request)
    token = authorization.removeprefix("Bearer ").strip()
    return await build_auth_service(request).me(token)


@router.get("/users/{user_id}")
async def user_by_id(request: Request, user_id: str):
    await require_service(request)
    return await build_auth_service(request).user_service.get_safe_user(user_id)


@router.post("/verify-token")
async def verify_token(request: Request, payload: dict):
    await require_service(request)
    token = str(payload.get("token", ""))
    auth = build_auth_service(request)
    data = auth.tokens.verify_access(token)
    user = await auth.user_service.get_safe_user(data["sub"])
    return {"valid": True, "user": user}


@router.post("/service-context")
async def service_context(request: Request, payload: dict):
    await require_service(request)
    token = str(payload.get("token", ""))
    auth = build_auth_service(request)
    data = auth.tokens.verify_access(token)
    user = await auth.user_service.get_safe_user(data["sub"])
    context = UserContext(
        user_id=user.id,
        role=user.role,
        school_ids=user.school_ids,
        active_school_id=user.active_school_id,
        token_version=user.token_version,
    )
    return context


@router.post("/demo-login")
async def demo_login(request: Request, payload: dict):
    await require_service(request)
    if not get_settings().auth_demo_mode:
        raise ForbiddenError("Demo login is disabled")
    role = payload.get("role", "teacher")
    emails = {
        "teacher": "teacher@aetherlearn.demo",
        "student": "student@aetherlearn.demo",
        "reviewer": "reviewer@aetherlearn.demo",
        "platform_admin": "admin@aetherlearn.demo",
    }
    email = emails.get(role)
    if email is None:
        raise ValidationAppError("Unsupported demo role")
    return await build_auth_service(request).login(LoginRequest(email=email, password="demo1234"))
