from typing import Any


class SyncOperationRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create_or_get(self, data: dict) -> dict:
        existing = await self.repo.find_one(operationId=data["operationId"])
        return existing or await self.repo.insert(data)

    async def get_by_operation_id(self, operation_id: str) -> dict | None:
        return await self.repo.find_one(operationId=operation_id)

    async def get_by_idempotency_key(self, idempotency_key: str) -> dict | None:
        return await self.repo.find_one(idempotencyKey=idempotency_key)

    async def list_for_user(self, user_id: str) -> list[dict]:
        return await self.repo.list(userId=user_id)
