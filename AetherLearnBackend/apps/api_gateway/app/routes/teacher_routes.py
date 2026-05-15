from __future__ import annotations

import base64
import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Request, UploadFile
from service_auth import UserContext
from shared_schemas import CreateAssignmentRequest, CreateClassroomRequest, GenerateFromTextInput
from shared_utils.image import validate_image_upload
from shared_utils.response import success_response

from ..dependencies import clients, request_id, teacher_context
from ..env import get_settings

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


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
    data = await clients()["school"].request(
        "GET", f"/internal/classes/{classroom_id}", request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)


@router.post("/classes/{classroom_id}/join-code")
async def join_code(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["school"].request(
        "POST",
        f"/internal/classes/{classroom_id}/join-code",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/classes/{classroom_id}/students")
async def class_students(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["school"].request(
        "GET",
        f"/internal/classes/{classroom_id}/students",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/classes/{classroom_id}/progress")
async def class_progress(
    request: Request, classroom_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["assignment"].request(
        "GET",
        f"/internal/classes/{classroom_id}/progress",
        request_id=request_id(request),
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
    parsed_settings |= {"classSubjectId": classSubjectId, "classroomId": classroomId}
    c = clients()
    req_id = request_id(request)
    draft = await c["lesson"].request(
        "POST",
        "/internal/lessons/create-draft",
        request_id=req_id,
        user_context=ctx,
        json=parsed_settings
        | {
            "classSubjectId": classSubjectId,
            "classroomId": classroomId,
            "saveSourceImage": saveSourceImage,
        },
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
    draft = await c["lesson"].request(
        "POST",
        "/internal/lessons/create-draft",
        request_id=req_id,
        user_context=ctx,
        json=payload.settings | {"createdBy": ctx.user_id, "createdByRole": ctx.role},
    )
    pack = await c["ai"].request(
        "POST",
        "/internal/ai/generate-from-text",
        request_id=req_id,
        user_context=ctx,
        json=payload.model_dump(by_alias=True)
        | {"teacherId": ctx.user_id, "lessonId": draft["id"]},
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
    data = await clients()["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)


@router.get("/lessons/{lesson_id}/generation-status")
async def generation_status(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["lesson"].request(
        "GET",
        f"/internal/lessons/{lesson_id}/generation-status",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.patch("/lessons/{lesson_id}")
async def patch_lesson(
    request: Request, lesson_id: str, payload: dict, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["lesson"].request(
        "PATCH",
        f"/internal/lessons/{lesson_id}",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    request: Request, lesson_id: str, ctx: UserContext = Depends(teacher_context)
):
    data = await clients()["lesson"].request(
        "DELETE", f"/internal/lessons/{lesson_id}", request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/assign")
async def assign_lesson(
    request: Request,
    lesson_id: str,
    payload: CreateAssignmentRequest,
    ctx: UserContext = Depends(teacher_context),
):
    body = payload.model_dump(by_alias=True) | {"lessonId": lesson_id}
    data = await clients()["assignment"].request(
        "POST", "/internal/assignments", json=body, request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)


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
