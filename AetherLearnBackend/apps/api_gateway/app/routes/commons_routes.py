from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import ForkLessonRequest
from shared_utils.response import success_response

from ..dependencies import authenticated_context, clients, request_id

router = APIRouter(prefix="/api/commons", tags=["commons"])


@router.get("/search")
async def search(
    request: Request,
    q: str | None = None,
    subject: str | None = None,
    language: str | None = None,
    limit: int = 20,
):
    data = await clients()["commons"].request(
        "GET",
        "/internal/commons/search",
        params={"q": q, "subject": subject, "language": language, "limit": limit},
        request_id=request_id(request),
    )
    return success_response(data, request)


@router.get("/lessons/{lesson_id}")
async def lesson(request: Request, lesson_id: str):
    data = await clients()["commons"].request(
        "GET", f"/internal/commons/lessons/{lesson_id}", request_id=request_id(request)
    )
    return success_response(data, request)


@router.get("/collections")
async def collections(request: Request):
    data = await clients()["commons"].request(
        "GET", "/internal/commons/collections", request_id=request_id(request)
    )
    return success_response(data, request)


@router.get("/collections/{collection_id}")
async def collection(request: Request, collection_id: str):
    data = await clients()["commons"].request(
        "GET", f"/internal/commons/collections/{collection_id}", request_id=request_id(request)
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/save")
async def save(request: Request, lesson_id: str, ctx: UserContext = Depends(authenticated_context)):
    data = await clients()["commons"].request(
        "POST",
        f"/internal/commons/lessons/{lesson_id}/save",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/fork")
async def fork(
    request: Request,
    lesson_id: str,
    payload: ForkLessonRequest,
    ctx: UserContext = Depends(authenticated_context),
):
    body = payload.model_dump(by_alias=True) | {"lessonId": lesson_id}
    data = await clients()["commons"].request(
        "POST",
        f"/internal/commons/lessons/{lesson_id}/fork",
        json=body,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/report")
async def report(
    request: Request,
    lesson_id: str,
    payload: dict,
    ctx: UserContext = Depends(authenticated_context),
):
    data = await clients()["commons"].request(
        "POST",
        f"/internal/commons/lessons/{lesson_id}/report",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
