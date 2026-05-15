from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import ApproveReviewRequest, RejectReviewRequest, RequestChangesReviewRequest
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.decision_repository import DecisionRepository
from ..repository.report_repository import ReportRepository
from ..repository.review_repository import ReviewRepository
from ..service.moderation_report_service import ModerationReportService
from ..service.review_service import ReviewService

router = APIRouter(prefix="/internal/review", tags=["internal-review"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def ctx(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
    )


def services(request: Request):
    settings = get_settings()
    db = request.app.state.mongo
    reviews = ReviewRepository(repository_for(db, "commons_reviews", settings.mongodb_uri))
    decisions = DecisionRepository(repository_for(db, "review_decisions", settings.mongodb_uri))
    reports = ReportRepository(repository_for(db, "moderation_reports", settings.mongodb_uri))
    return ReviewService(reviews, decisions), ModerationReportService(reports)


@router.get("/pending")
async def pending(request: Request):
    await require_service(request)
    return await services(request)[0].pending()


@router.get("/lessons/{lesson_id}")
async def get_review(request: Request, lesson_id: str):
    await require_service(request)
    return await services(request)[0].get(lesson_id)


@router.post("/lessons/{lesson_id}/approve")
async def approve(request: Request, lesson_id: str, payload: ApproveReviewRequest):
    await require_service(request)
    return await services(request)[0].approve(lesson_id, ctx(request).user_id, payload)


@router.post("/lessons/{lesson_id}/reject")
async def reject(request: Request, lesson_id: str, payload: RejectReviewRequest):
    await require_service(request)
    return await services(request)[0].reject(lesson_id, ctx(request).user_id, payload)


@router.post("/lessons/{lesson_id}/request-changes")
async def request_changes(request: Request, lesson_id: str, payload: RequestChangesReviewRequest):
    await require_service(request)
    return await services(request)[0].request_changes(lesson_id, ctx(request).user_id, payload)


@router.get("/reports")
async def reports(request: Request):
    await require_service(request)
    return await services(request)[1].reports()


@router.post("/reports/{report_id}/resolve")
async def resolve_report(request: Request, report_id: str):
    await require_service(request)
    return await services(request)[1].resolve(report_id, ctx(request).user_id)
