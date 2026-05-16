from __future__ import annotations

from secrets import token_urlsafe
from uuid import uuid4

from shared_schemas import (
    ConfidenceNotes,
    GemmaTrace,
    ImageTraceMetadata,
    LessonPack,
    LessonStatus,
    LessonVisibility,
    RuntimeMode,
    SchemaStatus,
    SourceUnderstanding,
    StudentAccessPack,
    TeacherPack,
    TraceWarning,
)
from shared_utils.dates import utc_in
from shared_utils.errors import NotFoundError

from ..repository.lesson_access_code_repository import LessonAccessCodeRepository
from ..repository.lesson_repository import LessonRepository

LESSON_SCOPE_FIELDS = (
    "createdBy",
    "createdByRole",
    "schoolId",
    "classroomId",
    "classSubjectId",
    "language",
    "subject",
    "gradeBand",
    "tags",
    "visibility",
)


def draft_pack(data: dict) -> LessonPack:
    lesson_id = data["id"]
    title = data.get("title") or "Untitled classroom source"
    return LessonPack(
        id=lesson_id,
        title=title,
        source_understanding=SourceUnderstanding(
            title=title,
            inferred_topic=data.get("subject") or "General",
            unclear_areas=["Generation has not completed yet."],
        ),
        teacher_pack=TeacherPack(
            lesson_objective="Draft waiting for generation.",
            teacher_explanation="Generation is in progress.",
            low_resource_activity="Review the generated activity once ready.",
            homework="Draft homework will be generated.",
            teacher_review_checklist=["Confirm generated content before use."],
        ),
        student_access_pack=StudentAccessPack(
            listen_first_audio_script="This lesson is being prepared.",
            screen_reader_summary="Lesson generation is in progress.",
            visual_description="The teacher source is being analyzed.",
            simple_explanation="Your lesson will be ready soon.",
        ),
        confidence_notes=ConfidenceNotes(
            overall_confidence=0.0,
            notes=["Draft only."],
            teacher_review_warnings=["Generation has not completed."],
        ),
        trace=GemmaTrace(
            runtime=RuntimeMode.MOCK,
            model="none-yet",
            local_only=True,
            hosted_api_used=False,
            latency_ms=0,
            schema_status=SchemaStatus.FALLBACK,
            fallback_used=False,
            image_metadata=ImageTraceMetadata(
                source_image_stored=bool(data.get("sourceImageStored", False))
            ),
            warnings=[TraceWarning(code="DRAFT", message="Lesson generation is pending.")],
        ),
        status=LessonStatus.DRAFT,
        visibility=LessonVisibility.PRIVATE,
        created_by=data["createdBy"],
        created_by_role=data["createdByRole"],
        school_id=data.get("schoolId"),
        classroom_id=data.get("classroomId"),
        class_subject_id=data.get("classSubjectId"),
        language=data.get("language", "en"),
        subject=data.get("subject", "General"),
        grade_band=data.get("gradeBand", "unknown"),
        tags=data.get("tags", []),
    )


class LessonService:
    def __init__(self, lessons: LessonRepository, access_codes: LessonAccessCodeRepository) -> None:
        self.lessons = lessons
        self.access_codes = access_codes

    async def create_draft(self, data: dict) -> LessonPack:
        created = await self.lessons.create(
            {
                "title": data.get("title") or "Classroom source",
                "createdBy": data["createdBy"],
                "createdByRole": data.get("createdByRole", "teacher"),
                "schoolId": data.get("schoolId"),
                "classroomId": data.get("classroomId"),
                "classSubjectId": data.get("classSubjectId"),
                "language": data.get("language", "en"),
                "subject": data.get("subject", "General"),
                "gradeBand": data.get("gradeBand", "unknown"),
                "tags": data.get("tags", []),
                "status": LessonStatus.DRAFT,
                "visibility": LessonVisibility.PRIVATE,
                "sourceImageStored": bool(data.get("saveSourceImage", False)),
            }
        )
        pack = draft_pack(created)
        updated = await self.lessons.update(
            created["id"], pack.model_dump(mode="json", by_alias=True)
        )
        return LessonPack.model_validate(updated)

    async def request_generation(self, lesson_id: str, payload: dict) -> dict:
        lesson = await self.lessons.get(lesson_id)
        if not lesson:
            raise NotFoundError("Lesson not found")
        generation_id = str(uuid4())
        await self.lessons.update(
            lesson_id,
            {
                "status": LessonStatus.GENERATING,
                "generationId": generation_id,
                "generationRequest": payload,
            },
        )
        return {"lessonId": lesson_id, "generationId": generation_id, "status": "generating"}

    async def apply_generation_result(self, lesson_id: str, pack: LessonPack) -> LessonPack:
        existing = await self.lessons.get(lesson_id)
        if not existing:
            raise NotFoundError("Lesson not found")
        data = pack.model_dump(mode="json", by_alias=True)
        data["id"] = lesson_id
        data["status"] = LessonStatus.GENERATED
        for field in LESSON_SCOPE_FIELDS:
            value = existing.get(field)
            if value is not None:
                data[field] = value
        updated = await self.lessons.update(lesson_id, data)
        return LessonPack.model_validate(updated)

    async def generation_failed(self, lesson_id: str, reason: str) -> dict:
        updated = await self.lessons.update(
            lesson_id,
            {"status": LessonStatus.GENERATION_FAILED, "generationError": reason},
        )
        if not updated:
            raise NotFoundError("Lesson not found")
        return updated

    async def get(self, lesson_id: str) -> LessonPack:
        lesson = await self.lessons.get(lesson_id)
        if not lesson:
            raise NotFoundError("Lesson not found")
        return LessonPack.model_validate(lesson)

    async def list_for_teacher(self, teacher_id: str) -> list[LessonPack]:
        return [
            LessonPack.model_validate(item)
            for item in await self.lessons.list_for_teacher(teacher_id)
        ]

    async def patch(self, lesson_id: str, data: dict) -> LessonPack:
        current = await self.lessons.get(lesson_id)
        if not current:
            raise NotFoundError("Lesson not found")
        updated = await self.lessons.update(lesson_id, data)
        return LessonPack.model_validate(updated)

    async def share_school(self, lesson_id: str) -> LessonPack:
        return await self.patch(lesson_id, {"visibility": LessonVisibility.SCHOOL})

    async def submit_commons(self, lesson_id: str) -> LessonPack:
        return await self.patch(
            lesson_id,
            {"visibility": LessonVisibility.SCHOOL, "status": LessonStatus.PENDING_REVIEW},
        )

    async def access_code(self, lesson_id: str, created_by: str) -> dict:
        await self.get(lesson_id)
        code = token_urlsafe(6).replace("-", "").replace("_", "").upper()[:10]
        return await self.access_codes.create(
            {
                "lessonId": lesson_id,
                "code": code,
                "createdBy": created_by,
                "expiresAt": utc_in(days=90),
            }
        )

    async def find_access_code(self, code: str) -> dict | None:
        return await self.access_codes.find_by_code(code)
