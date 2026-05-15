from __future__ import annotations

from shared_schemas import (
    CommonsLesson,
    CommonsSearchRequest,
    CommonsSearchResponse,
    ForkLessonRequest,
)
from shared_utils.errors import NotFoundError

from ..repository.commons_lesson_repository import CommonsLessonRepository
from ..repository.fork_repository import ForkRepository
from ..repository.report_repository import ReportRepository


class CommonsService:
    def __init__(
        self,
        lessons: CommonsLessonRepository,
        forks: ForkRepository,
        reports: ReportRepository,
    ) -> None:
        self.lessons = lessons
        self.forks = forks
        self.reports = reports

    async def publish(self, data: dict) -> CommonsLesson:
        lesson_pack = data.get("pack")
        item = await self.lessons.publish(
            {
                "lessonId": data["lessonId"],
                "title": data.get("title") or (lesson_pack or {}).get("title", "Untitled"),
                "subject": data.get("subject") or (lesson_pack or {}).get("subject", "General"),
                "gradeBand": data.get("gradeBand")
                or (lesson_pack or {}).get("gradeBand", "unknown"),
                "language": data.get("language") or (lesson_pack or {}).get("language", "en"),
                "tags": data.get("tags", []),
                "pack": lesson_pack,
                "publishedBy": data["publishedBy"],
                "verifiedEducator": data.get("verifiedEducator", False),
                "offlineDownloadable": data.get("offlineDownloadable", True),
                "searchText": data.get("searchText", ""),
            }
        )
        return CommonsLesson.model_validate(item)

    async def search(self, request: CommonsSearchRequest) -> CommonsSearchResponse:
        rows = await self.lessons.search(request.model_dump(by_alias=True))
        return CommonsSearchResponse(items=[CommonsLesson.model_validate(row) for row in rows])

    async def get(self, lesson_id: str) -> CommonsLesson:
        item = await self.lessons.get_by_lesson_id(lesson_id)
        if not item:
            raise NotFoundError("Commons lesson not found")
        return CommonsLesson.model_validate(item)

    async def save(self, lesson_id: str, user_id: str) -> dict:
        return {"lessonId": lesson_id, "savedBy": user_id, "saved": True}

    async def fork(self, payload: ForkLessonRequest, user_id: str) -> dict:
        return await self.forks.create(
            {
                "sourceLessonId": payload.lesson_id,
                "createdBy": user_id,
                "targetClassroomId": payload.target_classroom_id,
            }
        )

    async def report(self, lesson_id: str, user_id: str, reason: str) -> dict:
        return await self.reports.create(
            {"lessonId": lesson_id, "reportedBy": user_id, "reason": reason, "status": "open"}
        )
