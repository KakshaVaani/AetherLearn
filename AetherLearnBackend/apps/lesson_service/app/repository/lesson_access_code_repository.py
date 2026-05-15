from typing import Any


class LessonAccessCodeRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def find_by_code(self, code: str) -> dict | None:
        return await self.repo.find_one(code=code)
