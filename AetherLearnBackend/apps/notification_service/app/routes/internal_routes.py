from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import verify_internal_request_from_headers
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.notification_repository import NotificationRepository
from ..repository.push_token_repository import PushTokenRepository
from ..service.notification_service import NotificationService
from ..service.push_token_service import PushTokenService

router = APIRouter(prefix="/internal", tags=["internal-notifications"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def services(request: Request):
    settings = get_settings()
    db = request.app.state.mongo
    notifications = NotificationRepository(
        repository_for(db, "notifications", settings.mongodb_uri)
    )
    tokens = PushTokenRepository(repository_for(db, "push_tokens", settings.mongodb_uri))
    return NotificationService(notifications), PushTokenService(tokens)


@router.get("/users/{user_id}/notifications")
async def notifications(request: Request, user_id: str):
    await require_service(request)
    return await services(request)[0].list_user(user_id)


@router.patch("/notifications/{notification_id}/read")
async def read(request: Request, notification_id: str):
    await require_service(request)
    return await services(request)[0].read(notification_id)


@router.post("/notifications")
async def create(request: Request, payload: dict):
    await require_service(request)
    return await services(request)[0].create(payload)


@router.post("/push-tokens")
async def push_token(request: Request, payload: dict):
    await require_service(request)
    return await services(request)[1].create(payload)
