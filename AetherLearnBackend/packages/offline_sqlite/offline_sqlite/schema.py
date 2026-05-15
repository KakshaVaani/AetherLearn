from __future__ import annotations

SQLITE_SCHEMA_VERSION = 1


def offline_sqlite_schema() -> str:
    return """
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_cursors (
      scope TEXT PRIMARY KEY,
      cursor TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_entities (
      local_id TEXT PRIMARY KEY,
      server_id TEXT,
      entity_type TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_synced_at TEXT,
      deleted_at TEXT,
      conflict_state_json TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_entities_server
      ON offline_entities(entity_type, server_id)
      WHERE server_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_offline_entities_owner_status
      ON offline_entities(owner_user_id, sync_status);

    CREATE TABLE IF NOT EXISTS sync_operations (
      operation_id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      next_retry_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_operations_device_status
      ON sync_operations(user_id, device_id, status, created_at);

    CREATE TABLE IF NOT EXISTS conflicts (
      conflict_id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      server_state_json TEXT NOT NULL,
      client_state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_conflicts_operation
      ON conflicts(operation_id);

    CREATE TABLE IF NOT EXISTS offline_assets (
      asset_id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      lesson_id TEXT,
      object_key TEXT,
      local_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_offline_assets_owner
      ON offline_assets(owner_user_id, purpose);

    CREATE TABLE IF NOT EXISTS kvpack_imports (
      import_id TEXT PRIMARY KEY,
      lesson_id TEXT,
      manifest_json TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL,
      sync_status TEXT NOT NULL
    );
    """
