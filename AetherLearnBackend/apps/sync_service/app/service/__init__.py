from __future__ import annotations

from uuid import uuid4

from shared_schemas import SyncPullRequest, SyncPushRequest, SyncResult

from ..repository.device_state_repository import DeviceStateRepository
from ..repository.sync_operation_repository import SyncOperationRepository


class SyncService:
    def __init__(self, operations: SyncOperationRepository, devices: DeviceStateRepository) -> None:
        self.operations = operations
        self.devices = devices

    async def push(self, user_id: str, request: SyncPushRequest) -> dict:
        results: list[SyncResult] = []
        for operation in request.operations:
            try:
                data = operation.model_dump(by_alias=True)
                data["userId"] = user_id
                await self.operations.create_or_get(data)
                results.append(
                    SyncResult(operation_id=operation.operation_id, ok=True, status="processed")
                )
            except Exception as exc:
                results.append(
                    SyncResult(
                        operation_id=operation.operation_id,
                        ok=False,
                        status="failed",
                        data={"error": exc.__class__.__name__},
                    )
                )
        cursor = str(uuid4())
        await self.devices.upsert(user_id, request.device_id, cursor)
        return {"results": results, "cursor": cursor}

    async def pull(self, user_id: str, request: SyncPullRequest) -> dict:
        cursor = str(uuid4())
        await self.devices.upsert(user_id, request.device_id, cursor)
        return {
            "changes": {
                "assignments": [],
                "lessons": [],
                "notifications": [],
                "commons": [],
            },
            "cursor": cursor,
            "conflicts": [],
        }
