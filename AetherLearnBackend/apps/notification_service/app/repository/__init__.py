from typing import Any


class PushTokenRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)
