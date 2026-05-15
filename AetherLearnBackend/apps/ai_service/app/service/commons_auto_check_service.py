from __future__ import annotations

from shared_schemas import LessonPack


def commons_auto_check(pack: LessonPack) -> dict:
    checklist = {
        "accessibilityComplete": bool(pack.student_access_pack.visual_description),
        "traceAcceptable": pack.trace.teacher_review_required,
        "unsafeOverclaims": False,
        "autoApproved": False,
    }
    return {"lessonId": pack.id, "status": "needs_reviewer", "checklist": checklist}
