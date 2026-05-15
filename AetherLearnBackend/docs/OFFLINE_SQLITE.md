# Offline SQLite Layer

AetherLearn uses SQLite as a device-local offline layer. SQLite is not a
replacement for service-owned MongoDB databases. It is a cache plus operation
queue used by low-connectivity clients.

## Ownership

```text
Mobile or edge client SQLite
  local cache
  queued operations
  sync cursor
  conflict state

Backend services
  authoritative MongoDB data
  permissions
  assignment validity
  Commons review
  AI trace history
```

The backend exposes `/api/sync/status`, `/api/sync/pull`, and `/api/sync/push`.
Clients use the status response to learn the supported SQLite schema version
and sync batch policy.

## Reference Package

The Python reference implementation lives in:

```text
packages/offline_sqlite/
```

It provides:

- `offline_sqlite_schema()` for the canonical SQLite DDL.
- `OfflineSQLiteStore` for Python clients, school-hub tooling, and tests.
- operation queue helpers that build `SyncPushRequest`.
- push-result handling that marks operations synced, failed, or conflicted.
- pull-change application for assignments, lessons, notifications, Commons,
  progress, and classes.

Mobile apps may implement the same schema natively instead of importing the
Python package.

## Tables

```text
metadata
sync_cursors
offline_entities
sync_operations
conflicts
offline_assets
kvpack_imports
```

`metadata` stores local metadata such as `schemaVersion`.
`sync_cursors` stores the last server cursor per sync scope.
`offline_entities` stores cached lessons, assignments, progress, classrooms,
notifications, Commons metadata, imported `.kvpack` lessons, and asset metadata.
`sync_operations` stores queued offline operations with `operation_id` and
`idempotency_key`, so retries are safe. `conflicts` stores unresolved conflict
details returned by the backend.

## Connectivity Behavior

Clients should classify the network as:

```text
online
slow
unstable
offline
```

Recommended behavior:

- `online`: use backend APIs and refresh SQLite cache.
- `slow`: read from SQLite first, queue non-critical writes.
- `unstable`: read local-first and push in small batches.
- `offline`: use SQLite only and queue all writes.

## Sync Push

1. Client writes local change to SQLite.
2. Client inserts a row into `sync_operations`.
3. Client builds `SyncPushRequest`.
4. Client sends `POST /api/sync/push`.
5. Backend processes each operation independently.
6. Client applies results and stores the returned cursor.

Duplicate retries are safe because the Sync Service checks both `operationId`
and `idempotencyKey`.

## Sync Pull

1. Client sends `POST /api/sync/pull` with `deviceId`, `cursor`, connectivity,
   and known lesson versions.
2. Backend returns changed assignments, lessons, notifications, Commons
   metadata, conflicts, and a new cursor.
3. Client applies changes transactionally into SQLite.

## Conflict Policy

- Progress: true-wins merge.
- Lesson content: versioned conflict.
- Assignment validity: server wins.
- Questions: append-only by timestamp.
- Commons: server-reviewed only.

## Security

- Do not store refresh tokens in plain SQLite.
- Prefer encrypted SQLite such as SQLCipher for real mobile builds.
- Store access and refresh secrets in the OS keychain or keystore.
- Store only student-safe lesson views on student devices.
- Clear or lock local data on logout or school-admin revocation.
- Do not store raw source images by default.
