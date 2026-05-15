from typing import Any


class SchoolRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def get(self, school_id: str) -> dict | None:
        return await self.repo.get(school_id)

    async def update(self, school_id: str, data: dict) -> dict | None:
        return await self.repo.update(school_id, data)
