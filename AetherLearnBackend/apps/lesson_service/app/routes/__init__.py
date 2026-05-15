from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import LessonPack
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.lesson_access_code_repository import LessonAccessCodeRepository
from ..repository.lesson_repository import LessonRepository
from ..service.lesson_service import LessonService

router = APIRouter(prefix="/internal", tags=["internal-lessons"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def service(request: Request) -> LessonService:
    settings = get_settings()
    db = request.app.state.mongo
    return LessonService(
        LessonRepository(repository_for(db, "lesson_packs", settings.mongodb_uri)),
        LessonAccessCodeRepository(repository_for(db, "lesson_access_codes", settings.mongodb_uri)),
    )


def user_context(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
    )


@router.post("/lessons/create-draft")
async def create_draft(request: Request, payload: dict):
    await require_service(request)
    ctx = user_context(request)
    payload.setdefault("createdBy", ctx.user_id)
    payload.setdefault("createdByRole", ctx.role)
    return await service(request).create_draft(payload)


@router.post("/lessons/{lesson_id}/request-generation")
async def request_generation(request: Request, lesson_id: str, payload: dict):
    await require_service(request)
    return await service(request).request_generation(lesson_id, payload)


@router.post("/lessons/{lesson_id}/apply-generation-result")
async def apply_generation_result(request: Request, lesson_id: str, payload: LessonPack):
    await require_service(request)
    return await service(request).apply_generation_result(lesson_id, payload)


@router.get("/lessons/{lesson_id}")
async def get_lesson(request: Request, lesson_id: str):
    await require_service(request)
    return await service(request).get(lesson_id)


@router.get("/lessons/{lesson_id}/generation-status")
async def generation_status(request: Request, lesson_id: str):
    await require_service(request)
    lesson = await service(request).get(lesson_id)
    return {
        "lessonId": lesson.id,
        "status": lesson.status,
        "trace": lesson.trace,
        "teacherReviewWarnings": lesson.confidence_notes.teacher_review_warnings,
    }


@router.get("/teacher/{teacher_id}/lessons")
async def teacher_lessons(request: Request, teacher_id: str):
    await require_service(request)
    return await service(request).list_for_teacher(teacher_id)


@router.patch("/lessons/{lesson_id}")
async def patch_lesson(request: Request, lesson_id: str, payload: dict):
    await require_service(request)
    return await service(request).patch(lesson_id, payload)


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(request: Request, lesson_id: str):
    await require_service(request)
    deleted = await service(request).lessons.delete(lesson_id)
    return {"deleted": deleted}


@router.post("/lessons/{lesson_id}/share-school")
async def share_school(request: Request, lesson_id: str):
    await require_service(request)
    return await service(request).share_school(lesson_id)


@router.post("/lessons/{lesson_id}/submit-commons")
async def submit_commons(request: Request, lesson_id: str):
    await require_service(request)
    return await service(request).submit_commons(lesson_id)


@router.post("/lessons/{lesson_id}/access-code")
async def access_code(request: Request, lesson_id: str):
    await require_service(request)
    ctx = user_context(request)
    return await service(request).access_code(lesson_id, ctx.user_id)


@router.get("/lessons/access-code/{code}")
async def find_access_code(request: Request, code: str):
    await require_service(request)
    return await service(request).find_access_code(code)
