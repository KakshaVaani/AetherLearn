from typing import Any


class LessonRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def get(self, lesson_id: str) -> dict | None:
        return await self.repo.get(lesson_id)

    async def list_for_teacher(self, teacher_id: str) -> list[dict]:
        return await self.repo.list(createdBy=teacher_id)

    async def update(self, lesson_id: str, data: dict) -> dict | None:
        return await self.repo.update(lesson_id, data)

    async def delete(self, lesson_id: str) -> bool:
        return await self.repo.delete(lesson_id)
