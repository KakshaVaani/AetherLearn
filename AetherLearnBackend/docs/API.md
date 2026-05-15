# API

Public clients call only `/api/*` routes on the gateway. Responses are wrapped
as `ApiSuccess` or `ApiError` with a `requestId`.

OpenAPI is available at `/api/openapi.json` and the FastAPI docs endpoint.

Important flows:

1. Teacher creates class: `POST /api/teacher/classes`
2. Student joins: `POST /api/student/join-class`
3. Teacher analyzes image: `POST /api/teacher/lessons/analyze`
4. Teacher assigns: `POST /api/teacher/lessons/{lesson_id}/assign`
5. Student studies: `GET /api/student/lessons/{lesson_id}`
6. Student asks: `POST /api/student/lessons/{lesson_id}/ask`
7. Client checks offline support: `GET /api/sync/status`
8. Client pushes SQLite queue: `POST /api/sync/push`
9. Client pulls server changes: `POST /api/sync/pull`

`GET /api/sync/status` includes an `offlineStore` object with SQLite support,
schema version, maximum batch size, recommended pull interval, and conflict
policy summary. This lets mobile clients keep their local SQLite schema aligned
with the backend sync contract.
