from typing import Any


class ObjectMetadataRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def get(self, object_id: str) -> dict | None:
        return await self.repo.get(object_id)
