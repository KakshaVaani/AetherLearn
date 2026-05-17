import { apiJson } from "@/api/client";
import { demoLogin } from "@/api/backend";
import { getDeviceId } from "@/api/localPreferences";
import {
  getSyncCursor,
  getSyncSummary,
  listQueuedOperations,
  LocalEntityType,
  markOperations,
  saveLocalEntity,
  setSyncCursor,
  SyncSummary
} from "@/api/localStore";
import { getSession } from "@/api/session";
import { Role } from "@/types";

export type ManualSyncResult = {
  pushed: number;
  pulled: number;
  failed: number;
  cursor?: string | null;
  summary: SyncSummary;
};

type SyncPushResponse = {
  results: Array<{ operationId?: string; operation_id?: string; ok: boolean; status: string }>;
  cursor?: string;
};

type SyncPullResponse = {
  changes?: Record<string, unknown[]>;
  cursor?: string;
  conflicts?: unknown[];
};

const MAX_SYNC_PUSH_BATCH = 100;

const pullEntityTypes: Record<string, LocalEntityType> = {
  assignments: "assignment",
  lessons: "lesson",
  progress: "progress",
  classes: "classroom",
  notes: "generated_note",
  generatedNotes: "generated_note"
};

async function ensureSession(role: Role) {
  const session = getSession();
  if (session?.accessToken && !session.accessToken.startsWith("local-demo-token-")) return session;
  await demoLogin(role);
  return getSession();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonSafeValue(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(jsonSafeValue);
  if (value instanceof Date) return value.toISOString();
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => typeof entryValue !== "undefined")
        .map(([key, entryValue]) => [key, jsonSafeValue(entryValue)])
    );
  }
  if (["string", "number", "boolean"].includes(typeof value)) return value;
  return String(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function operationPayload(operation: Awaited<ReturnType<typeof listQueuedOperations>>[number]) {
  const basePayload = isPlainObject(operation.payload)
    ? operation.payload
    : operation.payload == null
      ? {}
      : { value: operation.payload };
  const payload = jsonSafeValue({
    ...basePayload,
    entityType: operation.entityType ?? null,
    entityId: operation.entityId ?? null
  });
  return {
    id: operation.operationId,
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    userId: operation.userId,
    deviceId: operation.deviceId,
    operationType: operation.operationType,
    payload,
    status: operation.status,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt
  };
}

async function applyPullChanges(changes: Record<string, unknown[]> = {}) {
  for (const [collection, items] of Object.entries(changes)) {
    const entityType = pullEntityTypes[collection];
    if (!entityType) continue;
    for (const item of items) {
      const payload = item as Record<string, unknown>;
      const id = typeof payload.id === "string" ? payload.id : undefined;
      await saveLocalEntity(entityType, payload, {
        localId: id,
        serverId: id,
        syncStatus: "synced"
      });
    }
  }
}

export async function runManualSync(role: Role): Promise<ManualSyncResult> {
  await ensureSession(role);
  const operations = await listQueuedOperations();
  let pushed = 0;
  let failed = 0;

  if (operations.length > 0) {
    const batches = chunk(operations, MAX_SYNC_PUSH_BATCH);
    await markOperations(operations.map((operation) => operation.operationId), "syncing");

    for (const batch of batches) {
      const batchIds = batch.map((operation) => operation.operationId);
      try {
        const response = await apiJson<SyncPushResponse>("/api/sync/push", "POST", {
          deviceId: getDeviceId(),
          operations: batch.map(operationPayload)
        });
        const okIds = response.results
          .filter((item) => item.ok)
          .map((item) => item.operationId ?? item.operation_id)
          .filter(Boolean) as string[];
        const rejectedIds = response.results
          .filter((item) => !item.ok)
          .map((item) => item.operationId ?? item.operation_id)
          .filter(Boolean) as string[];
        const returnedIds = new Set([...okIds, ...rejectedIds]);
        const missingIds = batchIds.filter((id) => !returnedIds.has(id));

        pushed += okIds.length;
        failed += rejectedIds.length + missingIds.length;

        if (okIds.length > 0) await markOperations(okIds, "synced");
        if (rejectedIds.length + missingIds.length > 0) {
          await markOperations(
            [...rejectedIds, ...missingIds],
            "failed",
            "Backend rejected operation"
          );
        }
        if (response.cursor) await setSyncCursor(response.cursor);
      } catch (error) {
        await markOperations(
          batchIds,
          "failed",
          error instanceof Error ? error.message : "Sync failed"
        );
        failed += batchIds.length;
      }
    }
  }

  let pulled = 0;
  let cursor = await getSyncCursor();
  try {
    const pull = await apiJson<SyncPullResponse>("/api/sync/pull", "POST", {
      deviceId: getDeviceId(),
      cursor,
      connectivity: "online",
      knownLessonVersions: {}
    });
    cursor = pull.cursor ?? cursor;
    if (cursor) await setSyncCursor(cursor);
    await applyPullChanges(pull.changes);
    pulled = Object.values(pull.changes ?? {}).reduce((count, items) => count + items.length, 0);
  } catch {
    // Push results remain valid even if pull fails. Summary will show failed queue state.
  }

  return {
    pushed,
    pulled,
    failed,
    cursor,
    summary: await getSyncSummary()
  };
}

export { getSyncSummary };
