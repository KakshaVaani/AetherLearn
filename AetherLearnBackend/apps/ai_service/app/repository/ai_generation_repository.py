from typing import Any


class AiGenerationRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def get(self, generation_id: str) -> dict | None:
        return await self.repo.get(generation_id)
