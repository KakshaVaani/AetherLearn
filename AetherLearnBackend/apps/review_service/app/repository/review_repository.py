from typing import Any


class ReviewRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def pending(self) -> list[dict]:
        return await self.repo.list(status="pending")

    async def get_by_lesson(self, lesson_id: str) -> dict | None:
        return await self.repo.find_one(lessonId=lesson_id)

    async def update(self, review_id: str, data: dict) -> dict | None:
        return await self.repo.update(review_id, data)
