from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import AskInput, JoinClassRequest, SubmitAssignmentRequest
from shared_utils.response import success_response

from ..dependencies import clients, request_id, student_context

router = APIRouter(prefix="/api/student", tags=["student"])


def _classroom_ids(classes: list[dict]) -> str:
    return ",".join(str(item["id"]) for item in classes if item.get("id"))


@router.get("/dashboard")
async def dashboard(request: Request, ctx: UserContext = Depends(student_context)):
    c = clients()
    req_id = request_id(request)
    classes = await c["school"].request(
        "GET", f"/internal/student/{ctx.user_id}/classes", request_id=req_id, user_context=ctx
    )
    assignments = await c["assignment"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/assignments",
        params={"classroomIds": _classroom_ids(classes)},
        request_id=req_id,
        user_context=ctx,
    )
    return success_response({"classes": classes, "assignments": assignments}, request)


@router.post("/join-class")
async def join_class(
    request: Request, payload: JoinClassRequest, ctx: UserContext = Depends(student_context)
):
    data = await clients()["school"].request(
        "POST",
        f"/internal/student/{ctx.user_id}/join-class",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/join-lesson-code")
async def join_lesson_code(
    request: Request, payload: dict, ctx: UserContext = Depends(student_context)
):
    data = await clients()["assignment"].request(
        "POST",
        f"/internal/student/{ctx.user_id}/join-lesson-code",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/classes")
async def classes(request: Request, ctx: UserContext = Depends(student_context)):
    data = await clients()["school"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/classes",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/lessons")
async def lessons(request: Request, ctx: UserContext = Depends(student_context)):
    c = clients()
    req_id = request_id(request)
    classes = await c["school"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/classes",
        request_id=req_id,
        user_context=ctx,
    )
    data = await c["assignment"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/assignments",
        params={"classroomIds": _classroom_ids(classes)},
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/lessons/{lesson_id}")
async def lesson(request: Request, lesson_id: str, ctx: UserContext = Depends(student_context)):
    c = clients()
    req_id = request_id(request)
    classes = await c["school"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/classes",
        request_id=req_id,
        user_context=ctx,
    )
    access = await c["assignment"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/access",
        params={"classroomIds": _classroom_ids(classes)},
        request_id=req_id,
        user_context=ctx,
    )
    lesson_pack = await c["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=req_id, user_context=ctx
    )
    return success_response({"lesson": lesson_pack, "access": access}, request)


@router.post("/lessons/{lesson_id}/ask")
async def ask(
    request: Request, lesson_id: str, payload: dict, ctx: UserContext = Depends(student_context)
):
    c = clients()
    req_id = request_id(request)
    lesson_pack = await c["lesson"].request(
        "GET", f"/internal/lessons/{lesson_id}", request_id=req_id, user_context=ctx
    )
    answer = await c["ai"].request(
        "POST",
        "/internal/ai/ask",
        request_id=req_id,
        user_context=ctx,
        json=AskInput(
            lesson_pack=lesson_pack,
            question=payload["question"],
            student_profile=ctx.model_dump(by_alias=True),
        ).model_dump(by_alias=True),
    )
    await c["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        request_id=req_id,
        user_context=ctx,
        json={"askedQuestion": True},
    )
    return success_response(answer, request)


@router.patch("/lessons/{lesson_id}/progress")
async def progress(
    request: Request, lesson_id: str, payload: dict, ctx: UserContext = Depends(student_context)
):
    data = await clients()["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/save-offline")
async def save_offline(
    request: Request, lesson_id: str, ctx: UserContext = Depends(student_context)
):
    data = await clients()["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        json={"downloaded": True},
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/assignments/{assignment_id}/submit")
async def submit_assignment(
    request: Request,
    assignment_id: str,
    payload: SubmitAssignmentRequest,
    ctx: UserContext = Depends(student_context),
):
    data = await clients()["assignment"].request(
        "POST",
        f"/internal/student/{ctx.user_id}/assignments/{assignment_id}/submit",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
