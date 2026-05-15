from __future__ import annotations

from typing import Any

from shared_utils.mongo_repository import MongoRepository


class UserRepository:
    def __init__(self, repo: MongoRepository | Any) -> None:
        self.repo = repo

    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        return await self.repo.insert(document)

    async def get(self, user_id: str) -> dict[str, Any] | None:
        return await self.repo.get(user_id)

    async def find_by_email(self, email_normalized: str) -> dict[str, Any] | None:
        return await self.repo.find_one(emailNormalized=email_normalized)

    async def update(self, user_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        return await self.repo.update(user_id, patch)

    async def create_indexes(self) -> None:
        if hasattr(self.repo, "ensure_unique"):
            await self.repo.ensure_unique("emailNormalized")
