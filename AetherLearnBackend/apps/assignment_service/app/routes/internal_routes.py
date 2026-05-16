from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import BulkAssignmentRequest, CreateAssignmentRequest, SubmitAssignmentRequest
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.assignment_repository import AssignmentRepository
from ..repository.lesson_access_claim_repository import LessonAccessClaimRepository
from ..repository.progress_repository import ProgressRepository
from ..service.assignment_service import AssignmentService
from ..service.progress_service import ProgressService

router = APIRouter(prefix="/internal", tags=["internal-assignments"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def user_context(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
    )


def services(request: Request):
    settings = get_settings()
    db = request.app.state.mongo
    assignments = AssignmentRepository(repository_for(db, "assignments", settings.mongodb_uri))
    progress = ProgressRepository(repository_for(db, "student_progress", settings.mongodb_uri))
    claims = LessonAccessClaimRepository(
        repository_for(db, "lesson_access_claims", settings.mongodb_uri)
    )
    return (
        AssignmentService(assignments, progress),
        ProgressService(progress),
        assignments,
        progress,
        claims,
    )


def classroom_ids_from_param(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@router.post("/assignments")
async def create_assignment(request: Request, payload: CreateAssignmentRequest):
    await require_service(request)
    ctx = user_context(request)
    svc, *_ = services(request)
    return await svc.create(ctx.user_id, payload)


@router.post("/assignments/bulk")
async def bulk_assignments(request: Request, payload: BulkAssignmentRequest):
    await require_service(request)
    ctx = user_context(request)
    svc, *_ = services(request)
    result = []
    for assignment in payload.assignments:
        result.extend(await svc.create(ctx.user_id, assignment))
    return result


@router.get("/teacher/{teacher_id}/assignments")
async def teacher_assignments(request: Request, teacher_id: str):
    await require_service(request)
    svc, *_ = services(request)
    return await svc.list_teacher(teacher_id)


@router.get("/student/{student_id}/assignments")
async def student_assignments(
    request: Request,
    student_id: str,
    classroomIds: str | None = None,
):
    await require_service(request)
    svc, *_ = services(request)
    return await svc.list_student(student_id, classroom_ids_from_param(classroomIds))


@router.get("/student/{student_id}/lessons/{lesson_id}/access")
async def student_lesson_access(
    request: Request,
    student_id: str,
    lesson_id: str,
    classroomIds: str | None = None,
):
    await require_service(request)
    _, _, assignments, progress, _ = services(request)
    rows = await assignments.list_for_lesson_student(
        lesson_id,
        student_id,
        classroom_ids_from_param(classroomIds),
    )
    prog = await progress.get(student_id, lesson_id)
    return {"eligible": bool(rows), "assignments": rows, "progress": prog}


@router.patch("/student/{student_id}/lessons/{lesson_id}/progress")
async def update_progress(request: Request, student_id: str, lesson_id: str, payload: dict):
    await require_service(request)
    _, progress_svc, *_ = services(request)
    return await progress_svc.update(student_id, lesson_id, payload)


@router.post("/student/{student_id}/assignments/{assignment_id}/submit")
async def submit_assignment(
    request: Request,
    student_id: str,
    assignment_id: str,
    payload: SubmitAssignmentRequest,
    classroomIds: str | None = None,
):
    await require_service(request)
    _, progress_svc, assignments, *_ = services(request)
    return await progress_svc.submit_assignment(
        student_id=student_id,
        assignment_id=assignment_id,
        assignments=assignments,
        payload=payload,
        classroom_ids=classroom_ids_from_param(classroomIds),
    )


@router.post("/student/{student_id}/join-lesson-code")
async def join_lesson_code(request: Request, student_id: str, payload: dict):
    await require_service(request)
    *_, claims = services(request)
    return await claims.create(
        {"studentId": student_id, "code": payload.get("code"), "status": "claimed"}
    )


@router.get("/classes/{classroom_id}/progress")
async def class_progress(request: Request, classroom_id: str):
    await require_service(request)
    _, _, assignments, progress, _ = services(request)
    return {
        "assignments": await assignments.list_for_classroom(classroom_id),
        "progress": await progress.list_for_classroom(classroom_id),
    }
