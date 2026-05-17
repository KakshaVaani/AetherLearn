from __future__ import annotations

import base64
import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Request, UploadFile
from pydantic import Field, field_validator
from service_auth import UserContext
from shared_schemas import (
    AssignmentAnswerMode,
    AssignmentQuestion,
    CreateClassroomRequest,
    CreateSchoolRequest,
    GenerateFromTextInput,
    normalize_assignment_answer_mode,
)
from shared_schemas.base import AetherBase
from shared_utils.errors import ForbiddenError, ValidationAppError
from shared_utils.image import validate_image_upload
from shared_utils.response import success_response

from ..dependencies import clients, request_id, teacher_context
from ..env import get_settings

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


class AssignLessonRequest(AetherBase):
    classroom_id: str | None = None
    student_ids: list[str] = Field(default_factory=list)
    due_at: str | None = None
    instructions: str | None = None
    title: str | None = None
    answer_mode: AssignmentAnswerMode = "short_answer"
    versions: list[str] = Field(default_factory=list)
    questions: list[AssignmentQuestion] = Field(default_factory=list)

    @field_validator("answer_mode", mode="before")
    @classmethod
    def _normalize_answer_mode(cls, value: object) -> AssignmentAnswerMode:
        return normalize_assignment_answer_mode(value)


class GenerateAssignmentDraftRequest(AetherBase):
    classroom_id: str | None = None
    preferred_versions: list[str] = Field(default_factory=list)
    question_type: AssignmentAnswerMode = "short_answer"

    @field_validator("question_type", mode="before")
    @classmethod
    def _normalize_question_type(cls, value: object) -> AssignmentAnswerMode:
        return normalize_assignment_answer_mode(value)


class TeacherSetupClassRequest(AetherBase):
    name: str
    grade: str
    section: str | None = None
    subjects: list[str] = Field(default_factory=list)


class TeacherSetupRequest(AetherBase):
    school_name: str
    district: str | None = None
    state: str | None = None
    country: str = "IN"
    classes: list[TeacherSetupClassRequest] = Field(default_factory=list)


def _teacher_can_manage_classroom(ctx: UserContext, classroom: dict[str, Any]) -> bool:
    if ctx.user_id in {str(item) for item in classroom.get("teacherIds", [])}:
        return True
    if ctx.role == "school_admin":
        school_id = classroom.get("schoolId")
        return school_id == ctx.active_school_id or school_id in ctx.school_ids
    return False


async def _teacher_classroom(
    c: dict[str, Any],
    classroom_id: str,
    ctx: UserContext,
    req_id: str,
) -> dict[str, Any]:
    classroom = await c["school"].request(
        "GET", f"/internal/classes/{classroom_id}", request_id=req_id, user_context=ctx
    )
    if not _teacher_can_manage_classroom(ctx, classroom):
        raise ForbiddenError("Teacher is not assigned to this class")
    return classroom


async def _validate_class_subject(
    c: dict[str, Any],
    *,
    classroom_id: str,
    class_subject_id: str,
    ctx: UserContext,
    req_id: str,
) -> dict[str, Any]:
    subjects = await c["school"].request(
        "GET",
        f"/internal/classes/{classroom_id}/subjects",
        request_id=req_id,
        user_context=ctx,
    )
    for subject in subjects:
        if subject.get("id") == class_subject_id:
            if subject.get("teacherId") not in {ctx.user_id, None} and ctx.role != "school_admin":
                raise ForbiddenError("Teacher is not assigned to this class subject")
            return subject
    raise ValidationAppError("Class subject does not belong to this class")


async def _scoped_lesson_settings(
    c: dict[str, Any],
    *,
    settings: dict[str, Any],
    classroom_id: str | None,
    class_subject_id: str | None,
    ctx: UserContext,
    req_id: str,
) -> dict[str, Any]:
    scoped = dict(settings)
    classroom_id = classroom_id or scoped.get("classroomId")
    class_subject_id = class_subject_id or scoped.get("classSubjectId")
    if not classroom_id:
        return scoped

    classroom = await _teacher_classroom(c, str(classroom_id), ctx, req_id)
    scoped["classroomId"] = classroom["id"]
    scoped["schoolId"] = classroom.get("schoolId")
    scoped.setdefault("gradeBand", classroom.get("grade"))

    if class_subject_id:
        subject = await _validate_class_subject(
            c,
            classroom_id=classroom["id"],
            class_subject_id=str(class_subject_id),
            ctx=ctx,
            req_id=req_id,
        )
        scoped["classSubjectId"] = subject["id"]
        scoped.setdefault("subject", subject.get("subject"))

    return scoped


async def _create_join_code(
    c: dict[str, Any],
    classroom_id: str,
    ctx: UserContext,
    req_id: str,
) -> dict[str, Any]:
    return await c["school"].request(
        "POST",
        f"/internal/classes/{classroom_id}/join-code",
        request_id=req_id,
        user_context=ctx,
    )


async def _teacher_lesson(
    c: dict[str, Any], lesson_id: str, ctx: UserContext, req_id: str
) -> dict[str, Any]:
    lesson = await c["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=req_id, user_context=ctx
    )
    if lesson.get("createdBy") != ctx.user_id and ctx.role not in {"school_admin", "platform_admin"}:
        raise ForbiddenError("Lesson owner required")
    return lesson


def _assignment_target_classroom(
    lesson: dict[str, Any], requested_classroom_id: str | None
) -> str | None:
    lesson_classroom_id = lesson.get("classroomId")
    if lesson_classroom_id and requested_classroom_id and requested_classroom_id != lesson_classroom_id:
        raise ValidationAppError("Lesson can only be assigned to its own class")
    return requested_classroom_id or lesson_classroom_id


async def _generate_lesson_background(
    lesson_id: str,
    image_b64: str,
    mime_type: str,
    settings: dict,
    ctx: UserContext,
    req_id: str,
) -> None:
    c = clients()
    pack = await c["ai"].request(
        "POST",
        "/internal/ai/analyze-image",
        request_id=req_id,
        user_context=ctx,
        json={
            "imageBytesB64": image_b64,
            "mimeType": mime_type,
            "settings": settings,
            "teacherId": ctx.user_id,
            "lessonId": lesson_id,
        },
    )
    await c["lesson"].request(
        "POST",
        f"/internal/lessons/{lesson_id}/apply-generation-result",
        request_id=req_id,
        user_context=ctx,
        json=pack,
    )


@router.get("/dashboard")
async def dashboard(request: Request, ctx: UserContext = Depends(teacher_context)):
    c = clients()
    req_id = request_id(request)
    classes = await c["school"].request(
        "GET", f"/internal/teacher/{ctx.user_id}/classes", request_id=req_id, user_context=ctx
    )
    lessons = await c["lesson"].request(
        "GET", f"/internal/teacher/{ctx.user_id}/lessons", request_id=req_id, user_context=ctx
    )
    assignments = await c["assignment"].request(
        "GET", f"/internal/teacher/{ctx.user_id}/assignments", request_id=req_id, user_context=ctx
    )
    return success_response(
        {"classes": classes, "lessons": lessons, "assignments": assignments}, request
    )


@router.get("/classes")
async def classes(request: Request, ctx: UserContext = Depends(teacher_context)):
    data = await clients()["school"].request(
        "GET",
        f"/internal/teacher/{ctx.user_id}/classes",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/setup")
async def setup_teacher(
    request: Request, payload: TeacherSetupRequest, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    school = await c["school"].request(
        "POST",
        "/internal/schools",
        json=CreateSchoolRequest(
            name=payload.school_name.strip(),
            district=payload.district,
            state=payload.state,
            country=payload.country,
        ).model_dump(by_alias=True),
        request_id=req_id,
        user_context=ctx,
    )
    created_classes = []
    for class_payload in payload.classes:
        subjects = [subject.strip() for subject in class_payload.subjects if subject.strip()]
        if not subjects:
            continue
        classroom = await c["school"].request(
            "POST",
            f"/internal/teacher/{ctx.user_id}/classes",
            json=CreateClassroomRequest(
                school_id=school["id"],
                name=class_payload.name.strip(),
                grade=class_payload.grade.strip(),
                section=class_payload.section,
                subjects=subjects,
            ).model_dump(by_alias=True),
            request_id=req_id,
            user_context=ctx,
        )
        join_code = await _create_join_code(c, classroom["id"], ctx, req_id)
        enriched = await c["school"].request(
            "GET",
            f"/internal/classes/{classroom['id']}",
            request_id=req_id,
            user_context=ctx,
        )
        created_classes.append(enriched | {"joinCode": join_code.get("code")})
    return success_response({"school": school, "classes": created_classes}, request, status_code=201)


@router.post("/classes")
async def create_class(
    request: Request, payload: CreateClassroomRequest, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["school"].request(
        "POST",
        f"/internal/teacher/{ctx.user_id}/classes",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request, status_code=201)


@router.get("/classes/{classroom_id}")
async def get_class(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    data = await _teacher_classroom(c, classroom_id, ctx, request_id(request))
    return success_response(data, request)


@router.post("/classes/{classroom_id}/join-code")
async def join_code(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_classroom(c, classroom_id, ctx, req_id)
    data = await c["school"].request(
        "POST",
        f"/internal/classes/{classroom_id}/join-code",
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/classes/{classroom_id}/students")
async def class_students(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_classroom(c, classroom_id, ctx, req_id)
    data = await c["school"].request(
        "GET",
        f"/internal/classes/{classroom_id}/students",
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/classes/{classroom_id}/progress")
async def class_progress(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_classroom(c, classroom_id, ctx, req_id)
    data = await c["assignment"].request(
        "GET",
        f"/internal/classes/{classroom_id}/progress",
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/analyze")
async def analyze_lesson(
    request: Request,
    background: BackgroundTasks,
    image: UploadFile = File(...),
    settings: str = Form("{}"),
    classSubjectId: str | None = Form(default=None),
    classroomId: str | None = Form(default=None),
    saveSourceImage: bool = Form(default=False),
    assignToClass: bool = Form(default=False),
    ctx: UserContext = Depends(teacher_context),
):
    content = await image.read()
    validate_image_upload(content, image.content_type or "", get_settings().max_image_mb)
    parsed_settings = json.loads(settings or "{}")
    c = clients()
    req_id = request_id(request)
    parsed_settings = await _scoped_lesson_settings(
        c,
        settings=parsed_settings,
        classroom_id=classroomId,
        class_subject_id=classSubjectId,
        ctx=ctx,
        req_id=req_id,
    )
    draft = await c["lesson"].request(
        "POST",
        "/internal/lessons/create-draft",
        request_id=req_id,
        user_context=ctx,
        json=parsed_settings | {"saveSourceImage": saveSourceImage},
    )
    generation = await c["lesson"].request(
        "POST",
        f"/internal/lessons/{draft['id']}/request-generation",
        request_id=req_id,
        user_context=ctx,
        json={"settings": parsed_settings, "assignToClass": assignToClass},
    )
    background.add_task(
        _generate_lesson_background,
        draft["id"],
        base64.b64encode(content).decode("ascii"),
        image.content_type or "image/jpeg",
        parsed_settings,
        ctx,
        req_id,
    )
    return success_response(generation, request, status_code=202)


@router.post("/lessons/from-text")
async def from_text(
    request: Request, payload: GenerateFromTextInput, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    scoped_settings = await _scoped_lesson_settings(
        c,
        settings=payload.settings,
        classroom_id=None,
        class_subject_id=None,
        ctx=ctx,
        req_id=req_id,
    )
    draft = await c["lesson"].request(
        "POST",
        "/internal/lessons/create-draft",
        request_id=req_id,
        user_context=ctx,
        json=scoped_settings | {"createdBy": ctx.user_id, "createdByRole": ctx.role},
    )
    pack = await c["ai"].request(
        "POST",
        "/internal/ai/generate-from-text",
        request_id=req_id,
        user_context=ctx,
        json=payload.model_dump(by_alias=True)
        | {"settings": scoped_settings, "teacherId": ctx.user_id, "lessonId": draft["id"]},
    )
    data = await c["lesson"].request(
        "POST",
        f"/internal/lessons/{draft['id']}/apply-generation-result",
        request_id=req_id,
        user_context=ctx,
        json=pack,
    )
    return success_response(data, request, status_code=201)


@router.get("/lessons")
async def lessons(request: Request, ctx: UserContext = Depends(teacher_context)):
    data = await clients()["lesson"].request(
        "GET",
        f"/internal/teacher/{ctx.user_id}/lessons",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/lessons/{lesson_id}")
async def lesson(request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)):
    c = clients()
    data = await _teacher_lesson(c, lesson_id, ctx, request_id(request))
    return success_response(data, request)


@router.get("/lessons/{lesson_id}/generation-status")
async def generation_status(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_lesson(c, lesson_id, ctx, req_id)
    data = await c["lesson"].request(
        "GET",
        f"/internal/lessons/{lesson_id}/generation-status",
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.patch("/lessons/{lesson_id}")
async def patch_lesson(
    request: Request, lesson_id: str, payload: dict, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_lesson(c, lesson_id, ctx, req_id)
    data = await c["lesson"].request(
        "PATCH",
        f"/internal/lessons/{lesson_id}",
        json=payload,
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    c = clients()
    req_id = request_id(request)
    await _teacher_lesson(c, lesson_id, ctx, req_id)
    data = await c["lesson"].request(
        "DELETE", f"/internal/lessons/{lesson_id}", request_id=req_id, user_context=ctx
    )
    return success_response(data, request)


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    request: Request, assignment_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["assignment"].request(
        "DELETE",
        f"/internal/assignments/{assignment_id}",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/assign")
async def assign_lesson(
    request: Request,
    lesson_id: str,
    payload: AssignLessonRequest,
    ctx: UserContext = Depends(teacher_context),
):
    c = clients()
    req_id = request_id(request)
    lesson = await _teacher_lesson(c, lesson_id, ctx, req_id)
    requested_classroom_id = payload.classroom_id
    target_classroom_id = _assignment_target_classroom(lesson, requested_classroom_id)
    if target_classroom_id:
        await _teacher_classroom(c, target_classroom_id, ctx, req_id)
    body = payload.model_dump(by_alias=True) | {"lessonId": lesson_id, "classroomId": target_classroom_id}
    data = await c["assignment"].request(
        "POST", "/internal/assignments", json=body, request_id=req_id, user_context=ctx
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/generate-assignment-draft")
async def generate_assignment_draft(
    request: Request,
    lesson_id: str,
    payload: GenerateAssignmentDraftRequest,
    ctx: UserContext = Depends(teacher_context),
):
    c = clients()
    req_id = request_id(request)
    lesson = await _teacher_lesson(c, lesson_id, ctx, req_id)
    target_classroom_id = _assignment_target_classroom(lesson, payload.classroom_id)
    classroom = None
    if target_classroom_id:
        classroom = await _teacher_classroom(c, target_classroom_id, ctx, req_id)

    draft = await c["ai"].request(
        "POST",
        "/internal/ai/generate-assignment-draft",
        request_id=req_id,
        user_context=ctx,
        json={
            "lessonPack": lesson,
            "classroomName": classroom.get("name") if classroom else None,
            "grade": classroom.get("grade") if classroom else lesson.get("gradeBand"),
            "subject": lesson.get("subject"),
            "preferredVersions": payload.preferred_versions,
            "questionType": payload.question_type,
        },
    )
    return success_response(draft, request)


@router.post("/lessons/{lesson_id}/share-school")
async def share_school(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["lesson"].request(
        "POST",
        f"/internal/lessons/{lesson_id}/share-school",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/submit-commons")
async def submit_commons(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["lesson"].request(
        "POST",
        f"/internal/lessons/{lesson_id}/submit-commons",
        request_id=request_id(request),
        user_context=ctx,
    )
    await clients()["review"].request(
        "GET",
        f"/internal/review/lessons/{lesson_id}",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/export")
async def export_lesson(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    lesson = await clients()["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=request_id(request), user_context=ctx
    )
    data = await clients()["export"].request(
        "POST",
        "/internal/export/markdown",
        json=lesson,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/kvpack")
async def kvpack(request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)):
    lesson = await clients()["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=request_id(request), user_context=ctx
    )
    data = await clients()["export"].request(
        "POST",
        "/internal/export/kvpack",
        json=lesson,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
