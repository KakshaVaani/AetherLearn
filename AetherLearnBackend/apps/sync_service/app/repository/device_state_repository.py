from typing import Any


class DeviceStateRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def upsert(self, user_id: str, device_id: str, cursor: str) -> dict:
        existing = await self.repo.find_one(userId=user_id, deviceId=device_id)
        data = {"userId": user_id, "deviceId": device_id, "cursor": cursor}
        return (
            await self.repo.update(existing["id"], data)
            if existing
            else await self.repo.insert(data)
        )
