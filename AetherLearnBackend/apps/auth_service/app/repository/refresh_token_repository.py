from __future__ import annotations

from typing import Any


class RefreshTokenRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        return await self.repo.insert(document)

    async def find_by_hash(self, token_hash: str) -> dict[str, Any] | None:
        return await self.repo.find_one(tokenHash=token_hash, revoked=False)

    async def revoke(self, token_id: str) -> None:
        await self.repo.update(token_id, {"revoked": True})

    async def revoke_all_for_user(self, user_id: str) -> None:
        for token in await self.repo.list(userId=user_id):
            await self.repo.update(token["id"], {"revoked": True})

    async def create_indexes(self) -> None:
        if hasattr(self.repo, "ensure_unique"):
            await self.repo.ensure_unique("tokenHash")
