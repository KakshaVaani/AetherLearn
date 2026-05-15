from typing import Any


class NotificationRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def list_for_user(self, user_id: str) -> list[dict]:
        return await self.repo.list(userId=user_id)

    async def read(self, notification_id: str) -> dict | None:
        return await self.repo.update(notification_id, {"readAt": "now"})
