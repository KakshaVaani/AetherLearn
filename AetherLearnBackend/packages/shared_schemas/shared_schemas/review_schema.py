from __future__ import annotations

from pydantic import Field

from .base import AetherBase, Timestamped


class ReviewChecklist(AetherBase):
    source_clear: bool = False
    age_appropriate: bool = False
    accessibility_complete: bool = False
    visual_description_present: bool = False
    student_pack_usable: bool = False
    teacher_pack_usable: bool = False
    no_unsafe_claims: bool = False
    trace_acceptable: bool = False
    license_valid: bool = False
    language_quality_acceptable: bool = False
    notes: list[str] = Field(default_factory=list)


class CommonsReview(Timestamped):
    id: str
    lesson_id: str
    submitted_by: str
    status: str = "pending"
    checklist: ReviewChecklist = Field(default_factory=ReviewChecklist)


class ReviewDecision(Timestamped):
    id: str
    review_id: str
    reviewer_id: str
    decision: str
    reason: str | None = None


class ApproveReviewRequest(AetherBase):
    checklist: ReviewChecklist
    notes: str | None = None


class RejectReviewRequest(AetherBase):
    reason: str


class RequestChangesReviewRequest(AetherBase):
    requested_changes: list[str] = Field(min_length=1)
