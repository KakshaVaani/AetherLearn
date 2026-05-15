from typing import Any


class ProgressRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def upsert(self, student_id: str, lesson_id: str, patch: dict) -> dict:
        existing = await self.repo.find_one(studentId=student_id, lessonId=lesson_id)
        data = {"studentId": student_id, "lessonId": lesson_id, **patch}
        if existing:
            return await self.repo.update(existing["id"], data)
        return await self.repo.insert(
            data
            | {
                "opened": False,
                "listened": False,
                "practiced": False,
                "askedQuestion": False,
                "downloaded": False,
                "completed": False,
                "lastPosition": 0,
            }
        )

    async def get(self, student_id: str, lesson_id: str) -> dict | None:
        return await self.repo.find_one(studentId=student_id, lessonId=lesson_id)

    async def list_for_classroom(self, classroom_id: str) -> list[dict]:
        return await self.repo.list(classroomId=classroom_id)
