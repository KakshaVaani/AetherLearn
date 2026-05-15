from __future__ import annotations

from fastapi import Request
from service_auth import UserContext
from service_auth.permissions import (
    require_reviewer,
    require_student,
    require_teacher,
)
from shared_utils.errors import UnauthorizedError

from .clients import (
    AiClient,
    AssignmentClient,
    AuthClient,
    CommonsClient,
    ExportClient,
    LessonClient,
    NotificationClient,
    ReviewClient,
    SchoolClient,
    StorageClient,
    SyncClient,
)
from .env import Settings, get_settings


def request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", request.headers.get("X-Request-Id", "unknown")))


def clients(settings: Settings | None = None):
    settings = settings or get_settings()
    kwargs = {"service_name": settings.service_name, "secret": settings.internal_service_secret}
    return {
        "auth": AuthClient(settings.auth_service_url, **kwargs),
        "school": SchoolClient(settings.school_service_url, **kwargs),
        "lesson": LessonClient(settings.lesson_service_url, **kwargs),
        "ai": AiClient(settings.ai_service_url, **kwargs),
        "assignment": AssignmentClient(settings.assignment_service_url, **kwargs),
        "commons": CommonsClient(settings.commons_service_url, **kwargs),
        "review": ReviewClient(settings.review_service_url, **kwargs),
        "sync": SyncClient(settings.sync_service_url, **kwargs),
        "export": ExportClient(settings.export_service_url, **kwargs),
        "notification": NotificationClient(settings.notification_service_url, **kwargs),
        "storage": StorageClient(settings.storage_service_url, **kwargs),
    }


async def authenticated_context(request: Request) -> UserContext:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise UnauthorizedError("Bearer token required")
    data = await clients()["auth"].service_context(token, request_id(request))
    return UserContext.model_validate(data)


async def teacher_context(request: Request) -> UserContext:
    return require_teacher(await authenticated_context(request))


async def student_context(request: Request) -> UserContext:
    return require_student(await authenticated_context(request))


async def reviewer_context(request: Request) -> UserContext:
    return require_reviewer(await authenticated_context(request))
