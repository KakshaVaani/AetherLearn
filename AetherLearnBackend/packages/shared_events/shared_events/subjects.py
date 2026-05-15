from __future__ import annotations

SUBJECTS: dict[str, str] = {
    "UserCreated": "auth.user.created",
    "UserLoggedIn": "auth.user.logged_in",
    "UserRoleChanged": "auth.user.role_changed",
    "UserProfileUpdated": "auth.user.profile_updated",
    "UserDeactivated": "auth.user.deactivated",
    "SchoolCreated": "school.created",
    "ClassroomCreated": "school.classroom.created",
    "ClassSubjectCreated": "school.class_subject.created",
    "StudentEnrolled": "school.student.enrolled",
    "StudentRemoved": "school.student.removed",
    "JoinCodeCreated": "school.join_code.created",
    "LessonDraftCreated": "lesson.draft.created",
    "LessonGenerationRequested": "lesson.generation.requested",
    "LessonGenerationCompleted": "lesson.generation.completed",
    "LessonGenerationFailed": "lesson.generation.failed",
    "LessonUpdated": "lesson.updated",
    "LessonSharedToSchool": "lesson.shared_to_school",
    "LessonSubmittedToCommons": "lesson.submitted_to_commons",
    "LessonPublished": "lesson.published",
    "LessonArchived": "lesson.archived",
    "LessonAssigned": "lesson.assigned",
    "LessonOpened": "lesson.opened",
    "StudentProgressUpdated": "student.progress.updated",
    "LessonCompleted": "lesson.completed",
    "LessonDownloaded": "lesson.downloaded",
    "StudentQuestionAsked": "student.question.asked",
    "StudentQuestionAnswered": "student.question.answered",
    "CommonsSubmissionCreated": "commons.submission.created",
    "CommonsAutoCheckCompleted": "commons.auto_check.completed",
    "CommonsReviewApproved": "commons.review.approved",
    "CommonsReviewRejected": "commons.review.rejected",
    "CommonsChangesRequested": "commons.review.changes_requested",
    "CommonsLessonPublished": "commons.lesson.published",
    "CommonsLessonForked": "commons.lesson.forked",
    "CommonsLessonReported": "commons.lesson.reported",
    "CommonsLessonSaved": "commons.lesson.saved",
    "SyncOperationReceived": "sync.operation.received",
    "SyncOperationProcessed": "sync.operation.processed",
    "SyncConflictDetected": "sync.conflict.detected",
    "HubSyncCompleted": "sync.hub.completed",
    "ExportRequested": "export.requested",
    "ExportCompleted": "export.completed",
    "ExportFailed": "export.failed",
    "KvPackCreated": "kvpack.created",
    "KvPackImported": "kvpack.imported",
    "NotificationCreated": "notification.created",
}

CORE_SUBJECTS = set(SUBJECTS.values())
DEAD_LETTER_SUBJECT = "dead_letter.events"


def subject_for_event(event_type: str) -> str:
    return SUBJECTS[event_type]


def validate_subject(subject: str) -> bool:
    return subject in CORE_SUBJECTS or subject == DEAD_LETTER_SUBJECT
