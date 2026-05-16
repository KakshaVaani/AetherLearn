from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import AskInput, JoinClassRequest, SubmitAssignmentRequest
from shared_utils.errors import ForbiddenError
from shared_utils.response import success_response

from ..dependencies import clients, request_id, student_context

router = APIRouter(prefix="/api/student", tags=["student"])


def _classroom_ids(classes: list[dict]) -> str:
    return ",".join(str(item["id"]) for item in classes if item.get("id"))


async def _student_lesson_access(c: dict, ctx: UserContext, lesson_id: str, req_id: str):
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
    if not access.get("eligible"):
        raise ForbiddenError("Lesson is not assigned to this student")
    return access


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


@router.patch("/profile")
async def update_profile(request: Request, payload: dict, ctx: UserContext = Depends(student_context)):
    data = await clients()["auth"].update_student_profile(
        ctx.user_id,
        payload,
        request_id(request),
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
    access = await _student_lesson_access(c, ctx, lesson_id, req_id)
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
    await _student_lesson_access(c, ctx, lesson_id, req_id)
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
        ).model_dump(mode="json", by_alias=True),
    )
    await c["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        request_id=req_id,
        user_context=ctx,
        json={"askedQuestion": True},
    )
    return success_response(answer, request)


@router.post("/ask-doubt")
async def ask_doubt(request: Request, payload: dict, ctx: UserContext = Depends(student_context)):
    req_id = request_id(request)
    question = str(payload.get("question", "")).strip()
    if not question:
        question = "Explain this topic clearly."
    full_question = (
        "Answer the student's doubt completely using the supplied lesson context. "
        "Give a direct explanation, a simple real-life example, important points to remember, "
        "and one short practice question. Use student-friendly language and do not invent facts "
        "outside the lesson context.\n\n"
        f"Student doubt: {question}"
    )
    answer = await clients()["ai"].request(
        "POST",
        "/internal/ai/ask",
        request_id=req_id,
        user_context=ctx,
        json=AskInput(
            lesson_pack=payload["lessonPack"],
            question=full_question,
            student_profile={
                **ctx.model_dump(by_alias=True),
                "preferences": payload.get("studentProfile", {}),
            },
        ).model_dump(mode="json", by_alias=True),
    )
    return success_response(answer, request)


@router.patch("/lessons/{lesson_id}/progress")
async def progress(
    request: Request, lesson_id: str, payload: dict, ctx: UserContext = Depends(student_context)
):
    c = clients()
    req_id = request_id(request)
    await _student_lesson_access(c, ctx, lesson_id, req_id)
    data = await c["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        json=payload,
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/save-offline")
async def save_offline(
    request: Request, lesson_id: str, ctx: UserContext = Depends(student_context)
):
    c = clients()
    req_id = request_id(request)
    await _student_lesson_access(c, ctx, lesson_id, req_id)
    data = await c["assignment"].request(
        "PATCH",
        f"/internal/student/{ctx.user_id}/lessons/{lesson_id}/progress",
        json={"downloaded": True},
        request_id=req_id,
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
    c = clients()
    req_id = request_id(request)
    classes = await c["school"].request(
        "GET",
        f"/internal/student/{ctx.user_id}/classes",
        request_id=req_id,
        user_context=ctx,
    )
    data = await c["assignment"].request(
        "POST",
        f"/internal/student/{ctx.user_id}/assignments/{assignment_id}/submit",
        params={"classroomIds": _classroom_ids(classes)},
        json=payload.model_dump(by_alias=True),
        request_id=req_id,
        user_context=ctx,
    )
    return success_response(data, request)
