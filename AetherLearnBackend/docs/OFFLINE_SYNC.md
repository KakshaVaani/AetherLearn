# Offline Sync

Offline sync is built around a local SQLite cache and operation queue on the
client, plus authoritative backend services on the server.

The canonical SQLite reference package is `packages/offline_sqlite`; see
`docs/OFFLINE_SQLITE.md` for schema details.

Mobile clients push queued operations with `operationId` and `idempotencyKey`.
The Sync Service treats both as idempotency controls, so duplicate retries do
not create duplicate server-side operations. The service returns per-operation
results and a new cursor. Pull responses contain changed assignments, lessons,
notifications, Commons metadata, and conflicts.

Clients can call `/api/sync/status` to discover:

- SQLite support
- SQLite schema version
- maximum push batch size
- recommended pull interval
- conflict policy summary

Local operation states:

- `queued`
- `syncing`
- `synced`
- `failed`
- `conflict`
- `server_revoked`
- `local_only`

Conflict policy:

- Progress uses true-wins merge
- Lesson content is versioned
- Questions are timestamped
- Assignment validity comes from the server

SQLite is never the source of truth for roles, permissions, assignment
validity, Commons publishing, or moderation.
