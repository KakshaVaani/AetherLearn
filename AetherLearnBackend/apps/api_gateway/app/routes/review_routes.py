from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import ApproveReviewRequest, RejectReviewRequest, RequestChangesReviewRequest
from shared_utils.response import success_response

from ..dependencies import clients, request_id, reviewer_context
from ..env import get_settings

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/pending")
async def pending(request: Request, ctx: UserContext = Depends(reviewer_context)):
    data = await clients()["review"].request(
        "GET", "/internal/review/pending", request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)


@router.get("/lessons/{lesson_id}")
async def lesson(request: Request, lesson_id: str, ctx: UserContext = Depends(reviewer_context)):
    data = await clients()["review"].request(
        "GET",
        f"/internal/review/lessons/{lesson_id}",
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/approve")
async def approve(
    request: Request,
    lesson_id: str,
    payload: ApproveReviewRequest,
    ctx: UserContext = Depends(reviewer_context),
):
    c = clients()
    req_id = request_id(request)
    review = await c["review"].request(
        "POST",
        f"/internal/review/lessons/{lesson_id}/approve",
        json=payload.model_dump(by_alias=True),
        request_id=req_id,
        user_context=ctx,
    )
    published = None
    lesson = None
    if get_settings().commons_enabled:
        lesson = await c["lesson"].request(
            "GET",
            f"/internal/lessons/{lesson_id}",
            request_id=req_id,
            user_context=ctx,
        )
        published = await c["commons"].request(
            "POST",
            "/internal/commons/publish",
            json={
                "lessonId": lesson_id,
                "title": lesson.get("title"),
                "subject": lesson.get("subject"),
                "gradeBand": lesson.get("gradeBand"),
                "language": lesson.get("language"),
                "tags": lesson.get("tags", []),
                "pack": lesson,
                "publishedBy": lesson.get("createdBy", ctx.user_id),
                "verifiedEducator": lesson.get("sharing", {}).get("verifiedEducator", False),
                "offlineDownloadable": True,
                "searchText": lesson.get("searchText") or lesson.get("title", ""),
            },
            request_id=req_id,
            user_context=ctx,
        )
        lesson = await c["lesson"].request(
            "PATCH",
            f"/internal/lessons/{lesson_id}",
            json={
                "status": "published",
                "visibility": "commons",
                "sharing": {
                    **lesson.get("sharing", {}),
                    "commonsPublishedAt": review.get("updatedAt"),
                },
            },
            request_id=req_id,
            user_context=ctx,
        )
    return success_response(
        {"review": review, "commonsLesson": published, "lesson": lesson},
        request,
    )


@router.post("/lessons/{lesson_id}/reject")
async def reject(
    request: Request,
    lesson_id: str,
    payload: RejectReviewRequest,
    ctx: UserContext = Depends(reviewer_context),
):
    data = await clients()["review"].request(
        "POST",
        f"/internal/review/lessons/{lesson_id}/reject",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/lessons/{lesson_id}/request-changes")
async def changes(
    request: Request,
    lesson_id: str,
    payload: RequestChangesReviewRequest,
    ctx: UserContext = Depends(reviewer_context),
):
    data = await clients()["review"].request(
        "POST",
        f"/internal/review/lessons/{lesson_id}/request-changes",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
