from pydantic import BaseModel


class CommonsSubmissionCreated(BaseModel):
    lesson_id: str
    submitted_by: str


class CommonsReviewApproved(BaseModel):
    lesson_id: str
    reviewer_id: str


class CommonsReviewRejected(BaseModel):
    lesson_id: str
    reviewer_id: str


class CommonsChangesRequested(BaseModel):
    lesson_id: str
    reviewer_id: str
    changes: list[str]


class CommonsLessonPublished(BaseModel):
    lesson_id: str


class CommonsLessonForked(BaseModel):
    source_lesson_id: str
    new_lesson_id: str


class CommonsLessonReported(BaseModel):
    lesson_id: str
    report_id: str


class CommonsLessonSaved(BaseModel):
    lesson_id: str
    user_id: str
