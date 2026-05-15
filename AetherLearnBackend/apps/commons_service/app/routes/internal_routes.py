from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import CommonsSearchRequest, ForkLessonRequest
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.commons_collection_repository import CommonsCollectionRepository
from ..repository.commons_lesson_repository import CommonsLessonRepository
from ..repository.fork_repository import ForkRepository
from ..repository.report_repository import ReportRepository
from ..service.collection_service import CollectionService
from ..service.commons_service import CommonsService

router = APIRouter(prefix="/internal/commons", tags=["internal-commons"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def ctx(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
        required=False,
    )


def svc(request: Request):
    settings = get_settings()
    db = request.app.state.mongo
    lessons = CommonsLessonRepository(repository_for(db, "commons_lessons", settings.mongodb_uri))
    collections = CommonsCollectionRepository(
        repository_for(db, "commons_collections", settings.mongodb_uri)
    )
    forks = ForkRepository(repository_for(db, "lesson_forks", settings.mongodb_uri))
    reports = ReportRepository(repository_for(db, "commons_reports", settings.mongodb_uri))
    return CommonsService(lessons, forks, reports), CollectionService(collections)


@router.get("/search")
async def search(
    request: Request,
    q: str | None = None,
    subject: str | None = None,
    language: str | None = None,
    limit: int = 20,
):
    await require_service(request)
    commons, _ = svc(request)
    return await commons.search(
        CommonsSearchRequest(q=q, subject=subject, language=language, limit=limit)
    )


@router.get("/lessons/{lesson_id}")
async def get_lesson(request: Request, lesson_id: str):
    await require_service(request)
    commons, _ = svc(request)
    return await commons.get(lesson_id)


@router.get("/collections")
async def collections(request: Request):
    await require_service(request)
    _, collection_svc = svc(request)
    return await collection_svc.list()


@router.get("/collections/{collection_id}")
async def collection(request: Request, collection_id: str):
    await require_service(request)
    _, collection_svc = svc(request)
    return await collection_svc.get(collection_id)


@router.post("/lessons/{lesson_id}/save")
async def save(request: Request, lesson_id: str):
    await require_service(request)
    user = ctx(request)
    commons, _ = svc(request)
    return await commons.save(lesson_id, user.user_id if user else "anonymous")


@router.post("/lessons/{lesson_id}/fork")
async def fork(request: Request, lesson_id: str, payload: ForkLessonRequest):
    await require_service(request)
    user = ctx(request)
    commons, _ = svc(request)
    payload.lesson_id = lesson_id
    return await commons.fork(payload, user.user_id if user else "anonymous")


@router.post("/lessons/{lesson_id}/report")
async def report(request: Request, lesson_id: str, payload: dict):
    await require_service(request)
    user = ctx(request)
    commons, _ = svc(request)
    return await commons.report(
        lesson_id, user.user_id if user else "anonymous", payload.get("reason", "unspecified")
    )


@router.post("/publish")
async def publish(request: Request, payload: dict):
    await require_service(request)
    return await svc(request)[0].publish(payload)


@router.post("/unpublish")
async def unpublish(request: Request, payload: dict):
    await require_service(request)
    return {"lessonId": payload.get("lessonId"), "status": "unpublished"}
