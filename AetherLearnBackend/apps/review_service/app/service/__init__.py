from __future__ import annotations

from shared_schemas import (
    ApproveReviewRequest,
    CommonsReview,
    RejectReviewRequest,
    RequestChangesReviewRequest,
)

from ..repository.decision_repository import DecisionRepository
from ..repository.review_repository import ReviewRepository


class ReviewService:
    def __init__(self, reviews: ReviewRepository, decisions: DecisionRepository) -> None:
        self.reviews = reviews
        self.decisions = decisions

    async def pending(self) -> list[CommonsReview]:
        return [CommonsReview.model_validate(row) for row in await self.reviews.pending()]

    async def get(self, lesson_id: str) -> CommonsReview:
        row = await self.reviews.get_by_lesson(lesson_id)
        if not row:
            row = await self.reviews.create(
                {
                    "lessonId": lesson_id,
                    "submittedBy": "unknown",
                    "status": "pending",
                    "checklist": {},
                }
            )
        return CommonsReview.model_validate(row)

    async def approve(self, lesson_id: str, reviewer_id: str, payload: ApproveReviewRequest):
        review = await self.get(lesson_id)
        updated = await self.reviews.update(
            review.id,
            {"status": "approved", "checklist": payload.checklist.model_dump(by_alias=True)},
        )
        await self.decisions.create(
            {
                "reviewId": review.id,
                "reviewerId": reviewer_id,
                "decision": "approved",
                "reason": payload.notes,
            }
        )
        return CommonsReview.model_validate(updated)

    async def reject(self, lesson_id: str, reviewer_id: str, payload: RejectReviewRequest):
        review = await self.get(lesson_id)
        updated = await self.reviews.update(review.id, {"status": "rejected"})
        await self.decisions.create(
            {
                "reviewId": review.id,
                "reviewerId": reviewer_id,
                "decision": "rejected",
                "reason": payload.reason,
            }
        )
        return CommonsReview.model_validate(updated)

    async def request_changes(
        self, lesson_id: str, reviewer_id: str, payload: RequestChangesReviewRequest
    ):
        review = await self.get(lesson_id)
        updated = await self.reviews.update(
            review.id,
            {"status": "changes_requested", "requestedChanges": payload.requested_changes},
        )
        await self.decisions.create(
            {
                "reviewId": review.id,
                "reviewerId": reviewer_id,
                "decision": "changes_requested",
                "reason": "; ".join(payload.requested_changes),
            }
        )
        return CommonsReview.model_validate(updated)
