from typing import Any


class CommonsCollectionRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def list(self) -> list[dict]:
        return await self.repo.list()

    async def get(self, collection_id: str) -> dict | None:
        return await self.repo.get(collection_id)
