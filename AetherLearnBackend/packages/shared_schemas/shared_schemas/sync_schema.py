from __future__ import annotations

from enum import StrEnum

from pydantic import Field

from .base import AetherBase, JsonDict, Timestamped


class SyncOperationType(StrEnum):
    LOGIN_REFRESH = "LOGIN_REFRESH"
    JOIN_CLASS = "JOIN_CLASS"
    CREATE_CLASS = "CREATE_CLASS"
    CREATE_LESSON_FROM_IMAGE = "CREATE_LESSON_FROM_IMAGE"
    ASSIGN_LESSON = "ASSIGN_LESSON"
    UPDATE_PROGRESS = "UPDATE_PROGRESS"
    ASK_QUESTION = "ASK_QUESTION"
    DOWNLOAD_COMMONS_PACK = "DOWNLOAD_COMMONS_PACK"
    SAVE_LESSON_OFFLINE = "SAVE_LESSON_OFFLINE"
    SUBMIT_TO_COMMONS = "SUBMIT_TO_COMMONS"
    IMPORT_KVPACK = "IMPORT_KVPACK"
    EXPORT_KVPACK = "EXPORT_KVPACK"
    REPORT_CONTENT = "REPORT_CONTENT"


class ConnectivityMode(StrEnum):
    ONLINE = "online"
    SLOW = "slow"
    UNSTABLE = "unstable"
    OFFLINE = "offline"


class LocalSyncStatus(StrEnum):
    SYNCED = "synced"
    DIRTY = "dirty"
    QUEUED = "queued"
    SYNCING = "syncing"
    FAILED = "failed"
    CONFLICT = "conflict"
    SERVER_REVOKED = "server_revoked"
    LOCAL_ONLY = "local_only"


class OfflineEntityType(StrEnum):
    LESSON = "lesson"
    ASSIGNMENT = "assignment"
    PROGRESS = "progress"
    CLASSROOM = "classroom"
    NOTIFICATION = "notification"
    COMMONS_LESSON = "commons_lesson"
    KVPACK_IMPORT = "kvpack_import"
    OFFLINE_ASSET = "offline_asset"


class SyncOperation(Timestamped):
    id: str
    operation_id: str
    idempotency_key: str
    user_id: str
    device_id: str
    operation_type: SyncOperationType
    payload: JsonDict = Field(default_factory=dict)
    status: str = "queued"


class SyncPushRequest(AetherBase):
    device_id: str
    operations: list[SyncOperation]


class SyncPullRequest(AetherBase):
    device_id: str
    cursor: str | None = None
    connectivity: ConnectivityMode = ConnectivityMode.ONLINE
    known_lesson_versions: dict[str, int] = Field(default_factory=dict)


class SyncConflict(AetherBase):
    operation_id: str
    code: str
    message: str
    server_state: JsonDict = Field(default_factory=dict)
    client_state: JsonDict = Field(default_factory=dict)


class SyncResult(AetherBase):
    operation_id: str
    ok: bool
    status: str
    data: JsonDict = Field(default_factory=dict)
    conflict: SyncConflict | None = None


class DeviceState(Timestamped):
    id: str
    user_id: str
    device_id: str
    cursor: str | None = None
    last_seen_at: str | None = None


class OfflineStoreInfo(AetherBase):
    sqlite_supported: bool = True
    schema_version: int = 1
    max_batch_operations: int = 100
    recommended_pull_interval_seconds: int = 300
    queue_writes_when_slow: bool = True
    conflict_policy: dict[str, str] = Field(
        default_factory=lambda: {
            "progress": "true-wins merge",
            "lesson": "versioned conflict",
            "assignment": "server wins",
            "question": "append-only by timestamp",
            "commons": "server-reviewed only",
        }
    )
