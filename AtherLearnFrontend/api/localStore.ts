import { getDeviceId } from "@/api/localPreferences";
import { getSession } from "@/api/session";
import { SyncOperationState } from "@/types";

export type LocalEntityType =
  | "lesson"
  | "assignment"
  | "progress"
  | "classroom"
  | "generated_note"
  | "model_metadata";

export type LocalOperationType =
  | "CREATE_LESSON_FROM_TEXT"
  | "UPDATE_LESSON"
  | "ASSIGN_LESSON"
  | "UPDATE_PROGRESS"
  | "ASK_QUESTION"
  | "GENERATE_STUDENT_NOTE";

export type LocalEntity<T = unknown> = {
  localId: string;
  serverId?: string | null;
  entityType: LocalEntityType;
  ownerUserId: string;
  version: number;
  payload: T;
  syncStatus: SyncOperationState;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  conflictState?: unknown;
};

export type LocalOperation<T = unknown> = {
  operationId: string;
  idempotencyKey: string;
  userId: string;
  deviceId: string;
  operationType: LocalOperationType;
  entityType?: LocalEntityType;
  entityId?: string;
  payload: T;
  status: SyncOperationState;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string | null;
};

export type SyncSummary = Record<SyncOperationState, number> & {
  lastSyncedAt?: string | null;
};

type SQLiteDatabase = import("expo-sqlite").SQLiteDatabase;

const SQLITE_SCHEMA = `
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
`;

const ENTITY_KEY = "aetherlearn.local.entities.v1";
const OPERATION_KEY = "aetherlearn.local.operations.v1";
const METADATA_KEY = "aetherlearn.local.metadata.v1";

let sqliteDbPromise: Promise<SQLiteDatabase | null> | null = null;
let fallbackEntities: LocalEntity[] | null = null;
let fallbackOperations: LocalOperation[] | null = null;

function webStorage() {
  if (typeof globalThis === "undefined") return null;
  const maybeWindow = globalThis as typeof globalThis & {
    localStorage?: Storage;
    crypto?: { randomUUID?: () => string };
  };
  return maybeWindow.localStorage ?? null;
}

function now() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  const maybeGlobal = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  return `${prefix}-${maybeGlobal.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function ownerId() {
  return getSession()?.userId ?? "local-demo-user";
}

async function sqliteDb() {
  if (!sqliteDbPromise) {
    sqliteDbPromise = (async () => {
      try {
        const sqlite = await import("expo-sqlite");
        const db = await sqlite.openDatabaseAsync("aetherlearn-local.db");
        await db.execAsync(SQLITE_SCHEMA);
        await db.runAsync(
          "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
          ["schemaVersion", "1", now()]
        );
        return db;
      } catch {
        return null;
      }
    })();
  }
  return sqliteDbPromise;
}

function readFallback<T>(key: string, defaultValue: T): T {
  try {
    const raw = webStorage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeFallback(key: string, value: unknown) {
  try {
    webStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // In-memory fallback remains useful when web storage is unavailable.
  }
}

async function getFallbackEntities() {
  fallbackEntities ??= readFallback<LocalEntity[]>(ENTITY_KEY, []);
  return fallbackEntities;
}

async function setFallbackEntities(entities: LocalEntity[]) {
  fallbackEntities = entities;
  writeFallback(ENTITY_KEY, entities);
}

async function getFallbackOperations() {
  fallbackOperations ??= readFallback<LocalOperation[]>(OPERATION_KEY, []);
  return fallbackOperations;
}

async function setFallbackOperations(operations: LocalOperation[]) {
  fallbackOperations = operations;
  writeFallback(OPERATION_KEY, operations);
}

export async function saveLocalEntity<T>(
  entityType: LocalEntityType,
  payload: T,
  options: {
    localId?: string;
    serverId?: string | null;
    syncStatus?: SyncOperationState;
    ownerUserId?: string;
  } = {}
) {
  const timestamp = now();
  const localId = options.localId ?? makeId(entityType);
  const entity: LocalEntity<T> = {
    localId,
    serverId: options.serverId ?? null,
    entityType,
    ownerUserId: options.ownerUserId ?? ownerId(),
    version: 1,
    payload,
    syncStatus: options.syncStatus ?? "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSyncedAt: null
  };
  const db = await sqliteDb();
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_entities
      (local_id, server_id, entity_type, owner_user_id, version, payload_json, sync_status, created_at, updated_at, last_synced_at, conflict_state_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.localId,
        entity.serverId,
        entity.entityType,
        entity.ownerUserId,
        entity.version,
        JSON.stringify(entity.payload),
        entity.syncStatus,
        entity.createdAt,
        entity.updatedAt,
        entity.lastSyncedAt,
        null
      ]
    );
    return entity;
  }

  const entities = await getFallbackEntities();
  await setFallbackEntities([...entities.filter((item) => item.localId !== localId), entity]);
  return entity;
}

export async function replaceSyncedLocalEntities<T>(
  entityType: LocalEntityType,
  items: Array<{ localId: string; serverId?: string | null; payload: T }>,
  options: { ownerUserId?: string } = {}
) {
  const timestamp = now();
  const ownerUserId = options.ownerUserId ?? ownerId();
  const entities: LocalEntity<T>[] = items.map((item) => ({
    localId: item.localId,
    serverId: item.serverId ?? item.localId,
    entityType,
    ownerUserId,
    version: 1,
    payload: item.payload,
    syncStatus: "synced",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSyncedAt: timestamp
  }));

  const db = await sqliteDb();
  if (db) {
    await db.runAsync(
      "DELETE FROM offline_entities WHERE entity_type = ? AND owner_user_id = ? AND sync_status = ?",
      [entityType, ownerUserId, "synced"]
    );
    for (const entity of entities) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_entities
        (local_id, server_id, entity_type, owner_user_id, version, payload_json, sync_status, created_at, updated_at, last_synced_at, conflict_state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entity.localId,
          entity.serverId,
          entity.entityType,
          entity.ownerUserId,
          entity.version,
          JSON.stringify(entity.payload),
          entity.syncStatus,
          entity.createdAt,
          entity.updatedAt,
          entity.lastSyncedAt,
          null
        ]
      );
    }
    return entities;
  }

  const current = await getFallbackEntities();
  await setFallbackEntities([
    ...current.filter(
      (item) =>
        !(
          item.entityType === entityType &&
          item.ownerUserId === ownerUserId &&
          item.syncStatus === "synced"
        )
    ),
    ...entities
  ]);
  return entities;
}

export async function deleteLocalEntity(
  entityType: LocalEntityType,
  localId: string,
  options: { ownerUserId?: string } = {}
) {
  const ownerUserId = options.ownerUserId ?? ownerId();
  const db = await sqliteDb();
  if (db) {
    const rows = await db.getAllAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM offline_entities WHERE entity_type = ? AND local_id = ? AND owner_user_id = ?",
      [entityType, localId, ownerUserId]
    );
    await db.runAsync(
      "DELETE FROM offline_entities WHERE entity_type = ? AND local_id = ? AND owner_user_id = ?",
      [entityType, localId, ownerUserId]
    );
    return (rows[0]?.count ?? 0) > 0;
  }

  const current = await getFallbackEntities();
  const next = current.filter(
    (item) => !(item.entityType === entityType && item.localId === localId && item.ownerUserId === ownerUserId)
  );
  await setFallbackEntities(next);
  return next.length !== current.length;
}

export async function listLocalEntities<T>(entityType: LocalEntityType): Promise<LocalEntity<T>[]> {
  const db = await sqliteDb();
  if (db) {
    const rows = await db.getAllAsync<{
      local_id: string;
      server_id: string | null;
      entity_type: LocalEntityType;
      owner_user_id: string;
      version: number;
      payload_json: string;
      sync_status: SyncOperationState;
      created_at: string;
      updated_at: string;
      last_synced_at: string | null;
      conflict_state_json: string | null;
    }>("SELECT * FROM offline_entities WHERE entity_type = ? ORDER BY updated_at DESC", [entityType]);
    return rows.map((row) => ({
      localId: row.local_id,
      serverId: row.server_id,
      entityType: row.entity_type,
      ownerUserId: row.owner_user_id,
      version: row.version,
      payload: JSON.parse(row.payload_json) as T,
      syncStatus: row.sync_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncedAt: row.last_synced_at,
      conflictState: row.conflict_state_json ? JSON.parse(row.conflict_state_json) : undefined
    }));
  }
  return (await getFallbackEntities()).filter((item) => item.entityType === entityType) as LocalEntity<T>[];
}

export async function queueLocalOperation<T>(
  operationType: LocalOperationType,
  payload: T,
  options: {
    entityType?: LocalEntityType;
    entityId?: string;
    userId?: string;
  } = {}
) {
  const timestamp = now();
  const operationId = makeId("op");
  const operation: LocalOperation<T> = {
    operationId,
    idempotencyKey: `${operationType}:${options.entityId ?? operationId}`,
    userId: options.userId ?? ownerId(),
    deviceId: getDeviceId(),
    operationType,
    entityType: options.entityType,
    entityId: options.entityId,
    payload,
    status: "queued",
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    nextRetryAt: null
  };
  const db = await sqliteDb();
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_operations
      (operation_id, idempotency_key, user_id, device_id, operation_type, entity_type, entity_id, payload_json, status, attempts, last_error, created_at, updated_at, next_retry_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operation.operationId,
        operation.idempotencyKey,
        operation.userId,
        operation.deviceId,
        operation.operationType,
        operation.entityType ?? null,
        operation.entityId ?? null,
        JSON.stringify(operation.payload),
        operation.status,
        operation.attempts,
        operation.lastError,
        operation.createdAt,
        operation.updatedAt,
        operation.nextRetryAt
      ]
    );
    return operation;
  }
  const operations = await getFallbackOperations();
  await setFallbackOperations([...operations, operation]);
  return operation;
}

export async function listQueuedOperations() {
  const statuses: SyncOperationState[] = ["queued", "failed"];
  const db = await sqliteDb();
  if (db) {
    const rows = await db.getAllAsync<{
      operation_id: string;
      idempotency_key: string;
      user_id: string;
      device_id: string;
      operation_type: LocalOperationType;
      entity_type: LocalEntityType | null;
      entity_id: string | null;
      payload_json: string;
      status: SyncOperationState;
      attempts: number;
      last_error: string | null;
      created_at: string;
      updated_at: string;
      next_retry_at: string | null;
    }>(
      "SELECT * FROM sync_operations WHERE status IN (?, ?) ORDER BY created_at ASC",
      statuses
    );
    return rows.map((row) => ({
      operationId: row.operation_id,
      idempotencyKey: row.idempotency_key,
      userId: row.user_id,
      deviceId: row.device_id,
      operationType: row.operation_type,
      entityType: row.entity_type ?? undefined,
      entityId: row.entity_id ?? undefined,
      payload: JSON.parse(row.payload_json),
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      nextRetryAt: row.next_retry_at
    })) satisfies LocalOperation[];
  }
  return (await getFallbackOperations()).filter((operation) => statuses.includes(operation.status));
}

export async function markOperations(operationIds: string[], status: SyncOperationState, error?: string) {
  if (operationIds.length === 0) return;
  const timestamp = now();
  const db = await sqliteDb();
  if (db) {
    for (const operationId of operationIds) {
      await db.runAsync(
        "UPDATE sync_operations SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ? WHERE operation_id = ?",
        [status, error ?? null, timestamp, operationId]
      );
    }
    return;
  }
  const operations = await getFallbackOperations();
  await setFallbackOperations(
    operations.map((operation) =>
      operationIds.includes(operation.operationId)
        ? {
            ...operation,
            status,
            attempts: operation.attempts + 1,
            lastError: error ?? null,
            updatedAt: timestamp
          }
        : operation
    )
  );
}

export async function getSyncCursor(scope = "default") {
  const db = await sqliteDb();
  if (db) {
    const rows = await db.getAllAsync<{ cursor: string | null }>(
      "SELECT cursor FROM sync_cursors WHERE scope = ?",
      [scope]
    );
    return rows[0]?.cursor ?? null;
  }
  return readFallback<Record<string, string | null>>(METADATA_KEY, {})[`cursor:${scope}`] ?? null;
}

export async function setSyncCursor(cursor: string | null, scope = "default") {
  const timestamp = now();
  const db = await sqliteDb();
  if (db) {
    await db.runAsync(
      "INSERT OR REPLACE INTO sync_cursors (scope, cursor, updated_at) VALUES (?, ?, ?)",
      [scope, cursor, timestamp]
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
      ["lastSyncedAt", timestamp, timestamp]
    );
    return;
  }
  const metadata = readFallback<Record<string, string | null>>(METADATA_KEY, {});
  metadata[`cursor:${scope}`] = cursor;
  metadata.lastSyncedAt = timestamp;
  writeFallback(METADATA_KEY, metadata);
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const base: SyncSummary = {
    queued: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
    local_only: 0,
    lastSyncedAt: null
  };
  const db = await sqliteDb();
  if (db) {
    const rows = await db.getAllAsync<{ status: SyncOperationState; count: number }>(
      "SELECT status, COUNT(*) as count FROM sync_operations GROUP BY status"
    );
    for (const row of rows) base[row.status] = row.count;
    const metadata = await db.getAllAsync<{ value: string }>(
      "SELECT value FROM metadata WHERE key = ?",
      ["lastSyncedAt"]
    );
    base.lastSyncedAt = metadata[0]?.value ?? null;
    return base;
  }
  for (const operation of await getFallbackOperations()) {
    base[operation.status] += 1;
  }
  base.lastSyncedAt = readFallback<Record<string, string | null>>(METADATA_KEY, {}).lastSyncedAt ?? null;
  return base;
}
