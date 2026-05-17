from __future__ import annotations

from typing import Any
from uuid import uuid4

from shared_schemas import SyncOperation, SyncPullRequest, SyncPushRequest, SyncResult

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
                existing = await self.operations.get_by_operation_id(operation.operation_id)
                if existing is None:
                    existing = await self.operations.get_by_idempotency_key(
                        operation.idempotency_key
                    )
                if existing is not None:
                    results.append(
                        SyncResult(
                            operation_id=operation.operation_id,
                            ok=True,
                            status="duplicate",
                            data={"idempotent": True},
                        )
                    )
                    continue
                data = operation.model_dump(by_alias=True)
                data["userId"] = user_id
                data["status"] = "processed"
                await self.operations.create_or_get(data)
                results.append(
                    SyncResult(
                        operation_id=operation.operation_id,
                        ok=True,
                        status="processed",
                        data=self._result_data(operation),
                    )
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
        operations = await self.operations.list_for_user(user_id)
        return {
            "changes": self._changes_from_operations(operations),
            "cursor": cursor,
            "conflicts": [],
        }

    def _result_data(self, operation: SyncOperation) -> dict:
        return {
            "operationType": operation.operation_type,
            "entityType": operation.payload.get("entityType"),
            "localEntityId": operation.payload.get("entityId"),
        }

    def _changes_from_operations(self, operations: list[dict[str, Any]]) -> dict[str, list[dict]]:
        changes: dict[str, list[dict]] = {
            "assignments": [],
            "lessons": [],
            "notifications": [],
            "commons": [],
            "progress": [],
            "notes": [],
        }
        for operation in operations:
            operation_type = operation.get("operationType") or operation.get("operation_type")
            payload = operation.get("payload") or {}
            if not isinstance(payload, dict):
                continue
            if operation_type == "CREATE_LESSON_FROM_TEXT":
                lesson = payload.get("lesson") if isinstance(payload.get("lesson"), dict) else payload
                changes["lessons"].append(self._server_echo(operation, lesson))
            elif operation_type == "UPDATE_LESSON":
                lesson = payload.get("lesson") if isinstance(payload.get("lesson"), dict) else None
                if lesson is not None:
                    changes["lessons"].append(self._server_echo(operation, lesson))
            elif operation_type == "ASSIGN_LESSON":
                assignment = (
                    payload.get("assignment") if isinstance(payload.get("assignment"), dict) else payload
                )
                changes["assignments"].append(self._server_echo(operation, assignment))
            elif operation_type == "UPDATE_PROGRESS":
                changes["progress"].append(self._server_echo(operation, payload))
            elif operation_type == "GENERATE_STUDENT_NOTE":
                changes["notes"].append(self._server_echo(operation, payload))
        return changes

    def _server_echo(self, operation: dict[str, Any], payload: Any) -> dict:
        entity = dict(payload) if isinstance(payload, dict) else {"value": payload}
        operation_id = operation.get("operationId") or operation.get("operation_id")
        entity.setdefault("id", operation_id)
        entity.setdefault("serverSyncedAt", operation.get("updatedAt") or operation.get("updated_at"))
        entity["syncOperationId"] = operation_id
        entity["syncStatus"] = operation.get("status", "processed")
        return entity
