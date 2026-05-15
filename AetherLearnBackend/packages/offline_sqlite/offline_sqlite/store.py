from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from shared_schemas import (
    LocalSyncStatus,
    OfflineEntityType,
    SyncConflict,
    SyncOperation,
    SyncOperationType,
    SyncPushRequest,
    SyncResult,
)

from .schema import SQLITE_SCHEMA_VERSION, offline_sqlite_schema

JsonMap = Mapping[str, Any]


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _json_dump(value: JsonMap) -> str:
    return json.dumps(dict(value), sort_keys=True, separators=(",", ":"))


def _json_load(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    loaded = json.loads(value)
    return loaded if isinstance(loaded, dict) else {}


def _status_value(status: LocalSyncStatus | str) -> str:
    return status.value if isinstance(status, LocalSyncStatus) else status


def _entity_type_value(entity_type: OfflineEntityType | str) -> str:
    return entity_type.value if isinstance(entity_type, OfflineEntityType) else entity_type


def _operation_type_value(operation_type: SyncOperationType | str) -> str:
    return operation_type.value if isinstance(operation_type, SyncOperationType) else operation_type


class OfflineSQLiteStore:
    """Reference SQLite store for AetherLearn offline-first clients.

    This class is intentionally synchronous because SQLite is a local embedded store.
    Mobile clients can mirror this schema in their native SQLite layer; Python edge
    clients and tests can use this implementation directly.
    """

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection
        self.connection.row_factory = sqlite3.Row

    @classmethod
    def connect(cls, path: str | Path = ":memory:") -> OfflineSQLiteStore:
        connection = sqlite3.connect(str(path))
        store = cls(connection)
        store.initialize()
        return store

    def close(self) -> None:
        self.connection.close()

    def initialize(self) -> None:
        self.connection.executescript(offline_sqlite_schema())
        self.set_metadata("schemaVersion", str(SQLITE_SCHEMA_VERSION))
        self.connection.commit()

    def set_metadata(self, key: str, value: str) -> None:
        now = _now()
        self.connection.execute(
            """
            INSERT INTO metadata(key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            """,
            (key, value, now),
        )

    def get_metadata(self, key: str) -> str | None:
        row = self.connection.execute(
            "SELECT value FROM metadata WHERE key = ?",
            (key,),
        ).fetchone()
        return str(row["value"]) if row else None

    def set_cursor(self, cursor: str | None, scope: str = "default") -> None:
        self.connection.execute(
            """
            INSERT INTO sync_cursors(scope, cursor, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(scope) DO UPDATE SET
              cursor = excluded.cursor,
              updated_at = excluded.updated_at
            """,
            (scope, cursor, _now()),
        )
        self.connection.commit()

    def get_cursor(self, scope: str = "default") -> str | None:
        row = self.connection.execute(
            "SELECT cursor FROM sync_cursors WHERE scope = ?",
            (scope,),
        ).fetchone()
        return str(row["cursor"]) if row and row["cursor"] is not None else None

    def upsert_entity(
        self,
        *,
        entity_type: OfflineEntityType | str,
        owner_user_id: str,
        payload: JsonMap,
        server_id: str | None = None,
        local_id: str | None = None,
        version: int = 1,
        sync_status: LocalSyncStatus | str = LocalSyncStatus.SYNCED,
    ) -> str:
        now = _now()
        entity_value = _entity_type_value(entity_type)
        row = None
        if server_id:
            row = self.connection.execute(
                "SELECT local_id FROM offline_entities WHERE entity_type = ? AND server_id = ?",
                (entity_value, server_id),
            ).fetchone()
        entity_local_id = local_id or (str(row["local_id"]) if row else str(uuid4()))
        self.connection.execute(
            """
            INSERT INTO offline_entities(
              local_id, server_id, entity_type, owner_user_id, version, payload_json,
              sync_status, created_at, updated_at, last_synced_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(local_id) DO UPDATE SET
              server_id = excluded.server_id,
              entity_type = excluded.entity_type,
              owner_user_id = excluded.owner_user_id,
              version = excluded.version,
              payload_json = excluded.payload_json,
              sync_status = excluded.sync_status,
              updated_at = excluded.updated_at,
              last_synced_at = excluded.last_synced_at
            """,
            (
                entity_local_id,
                server_id,
                entity_value,
                owner_user_id,
                version,
                _json_dump(payload),
                _status_value(sync_status),
                now,
                now,
                now if _status_value(sync_status) == LocalSyncStatus.SYNCED.value else None,
            ),
        )
        self.connection.commit()
        return entity_local_id

    def get_entity(self, local_id: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            "SELECT * FROM offline_entities WHERE local_id = ?",
            (local_id,),
        ).fetchone()
        return self._entity_from_row(row) if row else None

    def list_entities(
        self,
        *,
        owner_user_id: str,
        entity_type: OfflineEntityType | str | None = None,
        sync_status: LocalSyncStatus | str | None = None,
    ) -> list[dict[str, Any]]:
        if entity_type is not None and sync_status is not None:
            rows = self.connection.execute(
                """
                SELECT * FROM offline_entities
                WHERE owner_user_id = ? AND entity_type = ? AND sync_status = ?
                """,
                (owner_user_id, _entity_type_value(entity_type), _status_value(sync_status)),
            ).fetchall()
        elif entity_type is not None:
            rows = self.connection.execute(
                """
                SELECT * FROM offline_entities
                WHERE owner_user_id = ? AND entity_type = ?
                """,
                (owner_user_id, _entity_type_value(entity_type)),
            ).fetchall()
        elif sync_status is not None:
            rows = self.connection.execute(
                """
                SELECT * FROM offline_entities
                WHERE owner_user_id = ? AND sync_status = ?
                """,
                (owner_user_id, _status_value(sync_status)),
            ).fetchall()
        else:
            rows = self.connection.execute(
                "SELECT * FROM offline_entities WHERE owner_user_id = ?",
                (owner_user_id,),
            ).fetchall()
        return [self._entity_from_row(row) for row in rows]

    def queue_operation(
        self,
        *,
        user_id: str,
        device_id: str,
        operation_type: SyncOperationType | str,
        payload: JsonMap,
        entity_type: OfflineEntityType | str | None = None,
        entity_id: str | None = None,
        operation_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> SyncOperation:
        now = _now()
        op_id = operation_id or str(uuid4())
        idem_key = idempotency_key or str(uuid4())
        op_value = _operation_type_value(operation_type)
        self.connection.execute(
            """
            INSERT INTO sync_operations(
              operation_id, idempotency_key, user_id, device_id, operation_type,
              entity_type, entity_id, payload_json, status, attempts, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(operation_id) DO NOTHING
            """,
            (
                op_id,
                idem_key,
                user_id,
                device_id,
                op_value,
                _entity_type_value(entity_type) if entity_type is not None else None,
                entity_id,
                _json_dump(payload),
                LocalSyncStatus.QUEUED.value,
                now,
                now,
            ),
        )
        self.connection.commit()
        return self._operation_by_id(op_id)

    def pending_operations(
        self, *, user_id: str, device_id: str, limit: int = 100
    ) -> list[SyncOperation]:
        rows = self.connection.execute(
            """
            SELECT * FROM sync_operations
            WHERE user_id = ?
              AND device_id = ?
              AND status IN (?, ?)
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (
                user_id,
                device_id,
                LocalSyncStatus.QUEUED.value,
                LocalSyncStatus.FAILED.value,
                limit,
            ),
        ).fetchall()
        return [self._operation_from_row(row) for row in rows]

    def create_push_request(
        self, *, user_id: str, device_id: str, limit: int = 100
    ) -> SyncPushRequest:
        operations = self.pending_operations(user_id=user_id, device_id=device_id, limit=limit)
        return SyncPushRequest(device_id=device_id, operations=operations)

    def mark_syncing(self, operations: Iterable[SyncOperation]) -> None:
        now = _now()
        self.connection.executemany(
            """
            UPDATE sync_operations
            SET status = ?, attempts = attempts + 1, updated_at = ?
            WHERE operation_id = ?
            """,
            [
                (LocalSyncStatus.SYNCING.value, now, operation.operation_id)
                for operation in operations
            ],
        )
        self.connection.commit()

    def apply_push_results(
        self,
        *,
        results: Iterable[SyncResult],
        cursor: str | None = None,
        scope: str = "default",
    ) -> None:
        for result in results:
            if result.ok:
                self._mark_operation_status(result.operation_id, LocalSyncStatus.SYNCED.value)
            elif result.conflict:
                self._mark_operation_status(result.operation_id, LocalSyncStatus.CONFLICT.value)
                self._record_conflict(result.conflict)
            else:
                self._mark_operation_status(
                    result.operation_id,
                    LocalSyncStatus.FAILED.value,
                    result.data.get("error") if result.data else result.status,
                )
        if cursor is not None:
            self.set_cursor(cursor, scope=scope)
        self.connection.commit()

    def apply_pull_changes(
        self,
        *,
        owner_user_id: str,
        changes: Mapping[str, list[JsonMap]],
        cursor: str | None,
        scope: str = "default",
    ) -> None:
        entity_map = {
            "assignments": OfflineEntityType.ASSIGNMENT,
            "lessons": OfflineEntityType.LESSON,
            "notifications": OfflineEntityType.NOTIFICATION,
            "commons": OfflineEntityType.COMMONS_LESSON,
            "progress": OfflineEntityType.PROGRESS,
            "classes": OfflineEntityType.CLASSROOM,
        }
        for collection_name, items in changes.items():
            entity_type = entity_map.get(collection_name)
            if entity_type is None:
                continue
            for item in items:
                server_id = str(item.get("id")) if item.get("id") is not None else None
                version = int(item.get("version", 1))
                self.upsert_entity(
                    entity_type=entity_type,
                    owner_user_id=owner_user_id,
                    payload=item,
                    server_id=server_id,
                    version=version,
                    sync_status=LocalSyncStatus.SYNCED,
                )
        if cursor is not None:
            self.set_cursor(cursor, scope=scope)

    def conflicts(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT * FROM conflicts WHERE resolved_at IS NULL ORDER BY created_at ASC"
        ).fetchall()
        return [self._conflict_from_row(row) for row in rows]

    def _operation_by_id(self, operation_id: str) -> SyncOperation:
        row = self.connection.execute(
            "SELECT * FROM sync_operations WHERE operation_id = ?",
            (operation_id,),
        ).fetchone()
        if row is None:
            raise ValueError(f"operation not found: {operation_id}")
        return self._operation_from_row(row)

    def _mark_operation_status(
        self, operation_id: str, status: str, last_error: str | None = None
    ) -> None:
        self.connection.execute(
            """
            UPDATE sync_operations
            SET status = ?, last_error = ?, updated_at = ?
            WHERE operation_id = ?
            """,
            (status, last_error, _now(), operation_id),
        )

    def _record_conflict(self, conflict: SyncConflict) -> None:
        self.connection.execute(
            """
            INSERT INTO conflicts(
              conflict_id, operation_id, entity_type, entity_id, code, message,
              server_state_json, client_state_json, created_at
            )
            VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                conflict.operation_id,
                conflict.code,
                conflict.message,
                _json_dump(conflict.server_state),
                _json_dump(conflict.client_state),
                _now(),
            ),
        )

    def _operation_from_row(self, row: sqlite3.Row) -> SyncOperation:
        return SyncOperation(
            id=str(row["operation_id"]),
            operation_id=str(row["operation_id"]),
            idempotency_key=str(row["idempotency_key"]),
            user_id=str(row["user_id"]),
            device_id=str(row["device_id"]),
            operation_type=SyncOperationType(str(row["operation_type"])),
            payload=_json_load(str(row["payload_json"])),
            status=str(row["status"]),
        )

    def _entity_from_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "localId": row["local_id"],
            "serverId": row["server_id"],
            "entityType": row["entity_type"],
            "ownerUserId": row["owner_user_id"],
            "version": row["version"],
            "payload": _json_load(row["payload_json"]),
            "syncStatus": row["sync_status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "lastSyncedAt": row["last_synced_at"],
            "deletedAt": row["deleted_at"],
            "conflictState": _json_load(row["conflict_state_json"]),
        }

    def _conflict_from_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "conflictId": row["conflict_id"],
            "operationId": row["operation_id"],
            "entityType": row["entity_type"],
            "entityId": row["entity_id"],
            "code": row["code"],
            "message": row["message"],
            "serverState": _json_load(row["server_state_json"]),
            "clientState": _json_load(row["client_state_json"]),
            "createdAt": row["created_at"],
            "resolvedAt": row["resolved_at"],
        }
