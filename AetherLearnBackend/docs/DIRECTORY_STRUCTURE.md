# AetherLearn Directory Structure

This guide explains the files that make up the AetherLearn backend.

Generated local folders are intentionally not part of the architecture:

- `.venv/` is the local Python virtual environment created by `uv`.
- `__pycache__/`, `.pytest_cache/`, `.mypy_cache/`, and `.ruff_cache/` are tool caches.
- Runtime data such as `.data/` is local storage output when enabled.

## Big Picture

```text
aetherlearn-backend/
  apps/          FastAPI microservices and background worker
  packages/      Shared Python packages used by services
  infra/         Docker Compose, Dockerfiles, NATS, Mongo, nginx config
  scripts/       Developer and operational scripts
  docs/          Architecture and operations documentation
  tests/         Cross-cutting test suite
```

The design rule is simple: public clients talk only to `api_gateway`; domain services own their own data; services communicate through signed HTTP calls or NATS events.

## Root Files

```text
.env.example
```

Runtime configuration template. It defines app identity, service URLs, MongoDB, Redis, NATS, JWT secrets, internal HMAC secret, AI runtime mode, storage backend, school-hub mode, upload limits, privacy flags, and CORS origins.

```text
.gitignore
```

Git ignore rules for local/generated files.

```text
AGENTS.md
```

Repository guidance for coding agents working in this project.

```text
README.md
```

Human entrypoint for setup, running services, Docker, seed data, API overview, runtimes, and tests.

```text
pyproject.toml
```

Root `uv` workspace and shared tooling configuration for Ruff, mypy, pytest, and package dependencies.

```text
uv.lock
```

Locked dependency graph for reproducible installs.

## apps/

`apps/` contains deployable services. Every service has a `pyproject.toml`, `tests/`, and an `app/` package.

Common service file pattern:

```text
app/__init__.py        Package marker and service docstring.
app/main.py            Exposes the ASGI `app` object for Uvicorn.
app/server.py          Builds the FastAPI app and wires routes.
app/env.py             Service-specific settings loaded from `.env`.
app/routes/            HTTP route handlers.
app/service/           Business logic.
app/repository/        Persistence logic for that service's own database.
app/events/            NATS publishers and consumers.
tests/__init__.py      Test package marker for that service.
pyproject.toml         Package metadata for the service.
```

### apps/api_gateway/

The public entrypoint. It validates public requests, authenticates users, signs internal service calls, normalizes API responses, enforces middleware, and aggregates frontend-friendly views.

```text
apps/api_gateway/pyproject.toml
```

Package metadata for the API gateway.

```text
apps/api_gateway/tests/__init__.py
```

Gateway test package marker.

```text
apps/api_gateway/app/__init__.py
apps/api_gateway/app/main.py
apps/api_gateway/app/server.py
apps/api_gateway/app/env.py
apps/api_gateway/app/dependencies.py
```

Core gateway app files. `env.py` defines gateway URLs for internal services. `dependencies.py` provides request/user/service helpers.

```text
apps/api_gateway/app/routes/auth_routes.py
apps/api_gateway/app/routes/teacher_routes.py
apps/api_gateway/app/routes/student_routes.py
apps/api_gateway/app/routes/commons_routes.py
apps/api_gateway/app/routes/review_routes.py
apps/api_gateway/app/routes/sync_routes.py
apps/api_gateway/app/routes/export_routes.py
apps/api_gateway/app/routes/status_routes.py
apps/api_gateway/app/routes/__init__.py
```

Public API route groups exposed under `/api/...`.

```text
apps/api_gateway/app/clients/base.py
apps/api_gateway/app/clients/auth_client.py
apps/api_gateway/app/clients/school_client.py
apps/api_gateway/app/clients/lesson_client.py
apps/api_gateway/app/clients/ai_client.py
apps/api_gateway/app/clients/assignment_client.py
apps/api_gateway/app/clients/commons_client.py
apps/api_gateway/app/clients/review_client.py
apps/api_gateway/app/clients/sync_client.py
apps/api_gateway/app/clients/export_client.py
apps/api_gateway/app/clients/notification_client.py
apps/api_gateway/app/clients/storage_client.py
apps/api_gateway/app/clients/__init__.py
```

Typed HTTP client wrappers used by the gateway to call internal services with service authentication headers.

```text
apps/api_gateway/app/middleware/request_id.py
apps/api_gateway/app/middleware/auth.py
apps/api_gateway/app/middleware/rate_limit.py
apps/api_gateway/app/middleware/errors.py
apps/api_gateway/app/middleware/__init__.py
```

Gateway middleware for request IDs, authentication, rate limiting, and consistent error responses.

```text
apps/api_gateway/app/openapi/customize.py
apps/api_gateway/app/openapi/__init__.py
```

OpenAPI customization for gateway documentation.

### apps/auth_service/

Owns users, roles, password hashes, refresh tokens, demo login, JWTs, and safe user mapping.

```text
apps/auth_service/pyproject.toml
apps/auth_service/tests/__init__.py
apps/auth_service/app/__init__.py
apps/auth_service/app/main.py
apps/auth_service/app/server.py
apps/auth_service/app/env.py
```

Auth service package, app entrypoint, server factory, and settings.

```text
apps/auth_service/app/routes/auth_routes.py
apps/auth_service/app/routes/internal_routes.py
apps/auth_service/app/routes/__init__.py
```

Auth HTTP endpoints. `internal_routes.py` exposes service-only login, refresh, verify-token, logout, and user lookup routes.

```text
apps/auth_service/app/service/auth_service.py
apps/auth_service/app/service/user_service.py
apps/auth_service/app/service/token_service.py
apps/auth_service/app/service/__init__.py
```

Auth business logic: signup/login flows, user profile operations, and token lifecycle.

```text
apps/auth_service/app/repository/user_repository.py
apps/auth_service/app/repository/refresh_token_repository.py
apps/auth_service/app/repository/password_reset_repository.py
apps/auth_service/app/repository/__init__.py
```

Mongo persistence for users, refresh tokens, and password reset records.

```text
apps/auth_service/app/security/password.py
apps/auth_service/app/security/jwt.py
apps/auth_service/app/security/safe_user.py
apps/auth_service/app/security/rate_limit.py
apps/auth_service/app/security/__init__.py
```

Password hashing, JWT creation/verification, safe user response mapping, and login rate-limit helpers.

```text
apps/auth_service/app/events/publishers.py
apps/auth_service/app/events/consumers.py
apps/auth_service/app/events/__init__.py
```

Auth-related event hooks.

### apps/school_service/

Owns schools, classrooms, subjects, enrollments, and join codes.

```text
apps/school_service/pyproject.toml
apps/school_service/tests/__init__.py
apps/school_service/app/__init__.py
apps/school_service/app/main.py
apps/school_service/app/server.py
apps/school_service/app/env.py
```

School service package and app setup.

```text
apps/school_service/app/routes/internal_routes.py
apps/school_service/app/routes/__init__.py
```

Internal school/classroom/enrollment APIs.

```text
apps/school_service/app/service/school_service.py
apps/school_service/app/service/classroom_service.py
apps/school_service/app/service/enrollment_service.py
apps/school_service/app/service/join_code_service.py
apps/school_service/app/service/__init__.py
```

Business logic for schools, classes, enrollments, and join-code lifecycle.

```text
apps/school_service/app/repository/school_repository.py
apps/school_service/app/repository/classroom_repository.py
apps/school_service/app/repository/class_subject_repository.py
apps/school_service/app/repository/enrollment_repository.py
apps/school_service/app/repository/join_code_repository.py
apps/school_service/app/repository/__init__.py
```

Mongo repositories for school-owned collections.

```text
apps/school_service/app/events/publishers.py
apps/school_service/app/events/consumers.py
apps/school_service/app/events/__init__.py
```

School domain event hooks.

### apps/lesson_service/

Owns lesson packs, versions, generation status, school sharing, Commons submission state, and lesson access codes.

```text
apps/lesson_service/pyproject.toml
apps/lesson_service/tests/__init__.py
apps/lesson_service/app/__init__.py
apps/lesson_service/app/main.py
apps/lesson_service/app/server.py
apps/lesson_service/app/env.py
```

Lesson service package and app setup.

```text
apps/lesson_service/app/routes/internal_routes.py
apps/lesson_service/app/routes/__init__.py
```

Internal lesson APIs for create draft, request generation, apply result, fetch status, edit, share, and access codes.

```text
apps/lesson_service/app/service/lesson_service.py
apps/lesson_service/app/service/lesson_generation_service.py
apps/lesson_service/app/service/lesson_edit_service.py
apps/lesson_service/app/service/lesson_access_code_service.py
apps/lesson_service/app/service/__init__.py
```

Lesson business logic and generation workflow coordination.

```text
apps/lesson_service/app/repository/lesson_repository.py
apps/lesson_service/app/repository/lesson_version_repository.py
apps/lesson_service/app/repository/lesson_access_code_repository.py
apps/lesson_service/app/repository/__init__.py
```

Mongo persistence for lesson packs, versions, and access codes.

```text
apps/lesson_service/app/events/publishers.py
apps/lesson_service/app/events/consumers.py
apps/lesson_service/app/events/__init__.py
```

Publishes and consumes lesson generation and lesson update events.

### apps/ai_service/

Owns AI runtimes, prompts, validation, trace construction, Q&A, and Commons auto-checks.

```text
apps/ai_service/pyproject.toml
apps/ai_service/tests/__init__.py
apps/ai_service/app/__init__.py
apps/ai_service/app/main.py
apps/ai_service/app/server.py
apps/ai_service/app/env.py
```

AI service package and app setup.

```text
apps/ai_service/app/routes/internal_routes.py
apps/ai_service/app/routes/__init__.py
```

Internal AI APIs for image analysis, text generation, Q&A, translation, lesson improvement, and Commons checks.

```text
apps/ai_service/app/service/ai_service.py
apps/ai_service/app/service/runtime_router.py
apps/ai_service/app/service/qna_service.py
apps/ai_service/app/service/commons_auto_check_service.py
apps/ai_service/app/service/image_preprocess_service.py
apps/ai_service/app/service/__init__.py
```

AI orchestration logic, runtime selection, Q&A, auto-checking, and image preprocessing.

```text
apps/ai_service/app/adapters/base.py
apps/ai_service/app/adapters/gemini_adapter.py
apps/ai_service/app/adapters/ollama_adapter.py
apps/ai_service/app/adapters/local_hub_adapter.py
apps/ai_service/app/adapters/mock_adapter.py
apps/ai_service/app/adapters/on_device_contract.py
apps/ai_service/app/adapters/__init__.py
```

AI runtime adapter contracts and implementations. The mock adapter is deterministic and honestly marks `runtime=mock`.

```text
apps/ai_service/app/prompts/analyze_image_prompt.py
apps/ai_service/app/prompts/ask_prompt.py
apps/ai_service/app/prompts/commons_review_prompt.py
apps/ai_service/app/prompts/repair_json_prompt.py
apps/ai_service/app/prompts/__init__.py
```

Prompt templates for lesson generation, student Q&A, Commons review support, and JSON repair.

```text
apps/ai_service/app/tools/image_quality.py
apps/ai_service/app/tools/accessibility_check.py
apps/ai_service/app/tools/speech_queue.py
apps/ai_service/app/tools/markdown_tools.py
apps/ai_service/app/tools/trace_tools.py
apps/ai_service/app/tools/sanitize.py
apps/ai_service/app/tools/__init__.py
```

Controlled helper functions used around model output. These do not execute arbitrary model-generated code.

```text
apps/ai_service/app/validators/json_extraction.py
apps/ai_service/app/validators/lesson_validation.py
apps/ai_service/app/validators/output_repair.py
apps/ai_service/app/validators/__init__.py
```

JSON extraction, Pydantic lesson pack validation, and safe repair/fallback logic.

```text
apps/ai_service/app/repository/ai_generation_repository.py
apps/ai_service/app/repository/ai_trace_repository.py
apps/ai_service/app/repository/prompt_version_repository.py
apps/ai_service/app/repository/tool_call_repository.py
apps/ai_service/app/repository/__init__.py
```

Mongo repositories for AI generations, traces, prompt versions, and tool-call logs.

```text
apps/ai_service/app/events/publishers.py
apps/ai_service/app/events/consumers.py
apps/ai_service/app/events/__init__.py
```

AI event hooks for generation and Q&A workflows.

### apps/assignment_service/

Owns assignment records, student lesson progress, and lesson access claims.

```text
apps/assignment_service/pyproject.toml
apps/assignment_service/tests/__init__.py
apps/assignment_service/app/__init__.py
apps/assignment_service/app/main.py
apps/assignment_service/app/server.py
apps/assignment_service/app/env.py
```

Assignment service package and app setup.

```text
apps/assignment_service/app/routes/internal_routes.py
apps/assignment_service/app/routes/__init__.py
```

Internal assignment and progress APIs.

```text
apps/assignment_service/app/service/assignment_service.py
apps/assignment_service/app/service/progress_service.py
apps/assignment_service/app/service/after_school_pack_service.py
apps/assignment_service/app/service/__init__.py
```

Assignment business logic, progress updates, and after-school pack metadata.

```text
apps/assignment_service/app/repository/assignment_repository.py
apps/assignment_service/app/repository/progress_repository.py
apps/assignment_service/app/repository/lesson_access_claim_repository.py
apps/assignment_service/app/repository/__init__.py
```

Mongo persistence for assignments, progress, and access claims.

```text
apps/assignment_service/app/events/publishers.py
apps/assignment_service/app/events/consumers.py
apps/assignment_service/app/events/__init__.py
```

Assignment and progress event hooks.

### apps/commons_service/

Owns public Commons lesson records, collections, saves, forks, reports, and text search.

```text
apps/commons_service/pyproject.toml
apps/commons_service/tests/__init__.py
apps/commons_service/app/__init__.py
apps/commons_service/app/main.py
apps/commons_service/app/server.py
apps/commons_service/app/env.py
```

Commons service package and app setup.

```text
apps/commons_service/app/routes/internal_routes.py
apps/commons_service/app/routes/__init__.py
```

Internal Commons APIs for search, publish, save, fork, report, and collections.

```text
apps/commons_service/app/service/commons_service.py
apps/commons_service/app/service/search_service.py
apps/commons_service/app/service/collection_service.py
apps/commons_service/app/service/fork_service.py
apps/commons_service/app/service/report_service.py
apps/commons_service/app/service/__init__.py
```

Commons business logic split by public lesson, search, collection, fork, and report operations.

```text
apps/commons_service/app/repository/commons_lesson_repository.py
apps/commons_service/app/repository/commons_collection_repository.py
apps/commons_service/app/repository/fork_repository.py
apps/commons_service/app/repository/report_repository.py
apps/commons_service/app/repository/__init__.py
```

Mongo persistence for Commons-owned collections.

```text
apps/commons_service/app/search/text_search.py
apps/commons_service/app/search/filters.py
apps/commons_service/app/search/__init__.py
```

Mongo text-search and filter helpers.

```text
apps/commons_service/app/events/publishers.py
apps/commons_service/app/events/consumers.py
apps/commons_service/app/events/__init__.py
```

Commons event hooks.

### apps/review_service/

Owns Commons moderation, review queue, reviewer decisions, checklists, and report handling.

```text
apps/review_service/pyproject.toml
apps/review_service/tests/__init__.py
apps/review_service/app/__init__.py
apps/review_service/app/main.py
apps/review_service/app/server.py
apps/review_service/app/env.py
```

Review service package and app setup.

```text
apps/review_service/app/routes/internal_routes.py
apps/review_service/app/routes/__init__.py
```

Internal moderation and review APIs.

```text
apps/review_service/app/service/review_service.py
apps/review_service/app/service/checklist_service.py
apps/review_service/app/service/moderation_report_service.py
apps/review_service/app/service/__init__.py
```

Review queue, checklist, approval/rejection, and moderation report logic.

```text
apps/review_service/app/repository/review_repository.py
apps/review_service/app/repository/decision_repository.py
apps/review_service/app/repository/report_repository.py
apps/review_service/app/repository/__init__.py
```

Mongo repositories for reviews, decisions, and reports.

```text
apps/review_service/app/events/publishers.py
apps/review_service/app/events/consumers.py
apps/review_service/app/events/__init__.py
```

Review and moderation event hooks.

### apps/sync_service/

Owns offline sync, operation logs, conflict handling, cursors, device state, and school-hub sync metadata.

```text
apps/sync_service/pyproject.toml
apps/sync_service/tests/__init__.py
apps/sync_service/app/__init__.py
apps/sync_service/app/main.py
apps/sync_service/app/server.py
apps/sync_service/app/env.py
```

Sync service package and app setup.

```text
apps/sync_service/app/routes/internal_routes.py
apps/sync_service/app/routes/__init__.py
```

Internal sync push/pull/status APIs.

```text
apps/sync_service/app/service/sync_service.py
apps/sync_service/app/service/pull_service.py
apps/sync_service/app/service/push_service.py
apps/sync_service/app/service/hub_sync_service.py
apps/sync_service/app/service/__init__.py
```

Offline sync business logic and school-hub sync coordination.

```text
apps/sync_service/app/repository/sync_operation_repository.py
apps/sync_service/app/repository/device_state_repository.py
apps/sync_service/app/repository/sync_cursor_repository.py
apps/sync_service/app/repository/hub_sync_repository.py
apps/sync_service/app/repository/__init__.py
```

Mongo persistence for sync operations, cursors, device state, and hub logs.

```text
apps/sync_service/app/conflict/resolver.py
apps/sync_service/app/conflict/progress_merge.py
apps/sync_service/app/conflict/lesson_version_merge.py
apps/sync_service/app/conflict/__init__.py
```

Conflict resolution helpers. Progress uses true-wins merge semantics.

```text
apps/sync_service/app/events/publishers.py
apps/sync_service/app/events/consumers.py
apps/sync_service/app/events/__init__.py
```

Sync event hooks.

### apps/export_service/

Owns Markdown/PDF exports and `.kvpack` import/export validation.

```text
apps/export_service/pyproject.toml
apps/export_service/tests/__init__.py
apps/export_service/app/__init__.py
apps/export_service/app/main.py
apps/export_service/app/server.py
apps/export_service/app/env.py
```

Export service package and app setup.

```text
apps/export_service/app/routes/internal_routes.py
apps/export_service/app/routes/__init__.py
```

Internal export/import APIs.

```text
apps/export_service/app/service/export_service.py
apps/export_service/app/service/import_service.py
apps/export_service/app/service/__init__.py
```

Export job and import workflow logic.

```text
apps/export_service/app/kvpack/manifest.py
apps/export_service/app/kvpack/builder.py
apps/export_service/app/kvpack/validator.py
apps/export_service/app/kvpack/importer.py
apps/export_service/app/kvpack/__init__.py
```

Portable `.kvpack` manifest, zip builder, validator, and importer.

```text
apps/export_service/app/markdown/teacher_markdown.py
apps/export_service/app/markdown/student_markdown.py
apps/export_service/app/markdown/__init__.py
```

Markdown builders for teacher and student lesson views.

```text
apps/export_service/app/pdf/homework_card.py
apps/export_service/app/pdf/worksheet_pdf.py
apps/export_service/app/pdf/__init__.py
```

PDF generation helpers for homework cards and worksheets.

```text
apps/export_service/app/repository/export_job_repository.py
apps/export_service/app/repository/kvpack_manifest_repository.py
apps/export_service/app/repository/__init__.py
```

Mongo persistence for export jobs and pack manifests.

```text
apps/export_service/app/events/publishers.py
apps/export_service/app/events/consumers.py
apps/export_service/app/events/__init__.py
```

Export and import event hooks.

### apps/notification_service/

Owns in-app notifications and push-token scaffolding.

```text
apps/notification_service/pyproject.toml
apps/notification_service/tests/__init__.py
apps/notification_service/app/__init__.py
apps/notification_service/app/main.py
apps/notification_service/app/server.py
apps/notification_service/app/env.py
```

Notification service package and app setup.

```text
apps/notification_service/app/routes/internal_routes.py
apps/notification_service/app/routes/__init__.py
```

Internal notification and push-token APIs.

```text
apps/notification_service/app/service/notification_service.py
apps/notification_service/app/service/push_token_service.py
apps/notification_service/app/service/__init__.py
```

Notification creation, read state, and push-token logic.

```text
apps/notification_service/app/repository/notification_repository.py
apps/notification_service/app/repository/push_token_repository.py
apps/notification_service/app/repository/__init__.py
```

Mongo persistence for notifications and push tokens.

```text
apps/notification_service/app/events/publishers.py
apps/notification_service/app/events/consumers.py
apps/notification_service/app/events/__init__.py
```

Notification event hooks.

### apps/storage_service/

Owns object metadata, local/MinIO/S3 drivers, and signed URL behavior.

```text
apps/storage_service/pyproject.toml
apps/storage_service/tests/__init__.py
apps/storage_service/app/__init__.py
apps/storage_service/app/main.py
apps/storage_service/app/server.py
apps/storage_service/app/env.py
```

Storage service package and app setup.

```text
apps/storage_service/app/routes/internal_routes.py
apps/storage_service/app/routes/__init__.py
```

Internal upload/download/object metadata APIs.

```text
apps/storage_service/app/service/storage_service.py
apps/storage_service/app/service/signed_url_service.py
apps/storage_service/app/service/__init__.py
```

Storage orchestration and signed URL logic.

```text
apps/storage_service/app/repository/object_metadata_repository.py
apps/storage_service/app/repository/__init__.py
```

Mongo persistence for object metadata.

```text
apps/storage_service/app/drivers/base.py
apps/storage_service/app/drivers/local_driver.py
apps/storage_service/app/drivers/minio_driver.py
apps/storage_service/app/drivers/s3_driver.py
apps/storage_service/app/drivers/__init__.py
```

Object storage driver interface and local, MinIO, S3-compatible implementations.

### apps/worker/

Background worker process for event-driven jobs.

```text
apps/worker/pyproject.toml
apps/worker/tests/__init__.py
apps/worker/app/__init__.py
apps/worker/app/main.py
apps/worker/app/env.py
```

Worker package and entrypoint.

```text
apps/worker/app/consumers/lesson_generation_consumer.py
apps/worker/app/consumers/notification_consumer.py
apps/worker/app/consumers/export_consumer.py
apps/worker/app/consumers/sync_consumer.py
apps/worker/app/consumers/__init__.py
```

Background NATS consumers for generation, notification, export, and sync jobs.

```text
apps/worker/app/jobs/cleanup_jobs.py
apps/worker/app/jobs/index_jobs.py
apps/worker/app/jobs/__init__.py
```

Scheduled or manual maintenance jobs.

## packages/

Shared packages keep cross-service contracts and utilities in one place. Services should import contracts from here rather than redefining them.

### packages/offline_sqlite/

Reference SQLite implementation for low-connectivity clients.

```text
packages/offline_sqlite/pyproject.toml
packages/offline_sqlite/offline_sqlite/__init__.py
packages/offline_sqlite/offline_sqlite/schema.py
packages/offline_sqlite/offline_sqlite/store.py
```

`schema.py` exposes the canonical SQLite DDL and schema version. `store.py`
implements local entity caching, queued operations, sync cursors, push-result
application, and conflict recording. Mobile clients can mirror this schema in
their native SQLite layer.

### packages/shared_schemas/

Pydantic v2 schemas for public responses, internal requests, events, and domain objects.

```text
packages/shared_schemas/pyproject.toml
packages/shared_schemas/shared_schemas/__init__.py
packages/shared_schemas/shared_schemas/base.py
packages/shared_schemas/shared_schemas/api_schema.py
packages/shared_schemas/shared_schemas/error_schema.py
packages/shared_schemas/shared_schemas/auth_schema.py
packages/shared_schemas/shared_schemas/user_schema.py
packages/shared_schemas/shared_schemas/school_schema.py
packages/shared_schemas/shared_schemas/classroom_schema.py
packages/shared_schemas/shared_schemas/lesson_pack_schema.py
packages/shared_schemas/shared_schemas/assignment_schema.py
packages/shared_schemas/shared_schemas/commons_schema.py
packages/shared_schemas/shared_schemas/review_schema.py
packages/shared_schemas/shared_schemas/sync_schema.py
packages/shared_schemas/shared_schemas/trace_schema.py
packages/shared_schemas/shared_schemas/kvpack_schema.py
packages/shared_schemas/shared_schemas/ai_schema.py
```

The files are grouped by product domain. `base.py` holds common base models and timestamp helpers; `__init__.py` re-exports schemas.

### packages/shared_events/

Event envelope, NATS bus wrapper, subject names, and typed event payload modules.

```text
packages/shared_events/pyproject.toml
packages/shared_events/shared_events/__init__.py
packages/shared_events/shared_events/event_envelope.py
packages/shared_events/shared_events/event_bus.py
packages/shared_events/shared_events/subjects.py
packages/shared_events/shared_events/events/__init__.py
packages/shared_events/shared_events/events/auth_events.py
packages/shared_events/shared_events/events/school_events.py
packages/shared_events/shared_events/events/lesson_events.py
packages/shared_events/shared_events/events/ai_events.py
packages/shared_events/shared_events/events/assignment_events.py
packages/shared_events/shared_events/events/commons_events.py
packages/shared_events/shared_events/events/review_events.py
packages/shared_events/shared_events/events/sync_events.py
packages/shared_events/shared_events/events/notification_events.py
```

`event_envelope.py` defines the common event shape; `event_bus.py` handles JetStream publish/subscribe; `subjects.py` validates event subject names.

### packages/shared_utils/

Reusable non-domain infrastructure helpers.

```text
packages/shared_utils/pyproject.toml
packages/shared_utils/shared_utils/__init__.py
packages/shared_utils/shared_utils/env.py
packages/shared_utils/shared_utils/service_app.py
packages/shared_utils/shared_utils/errors.py
packages/shared_utils/shared_utils/response.py
packages/shared_utils/shared_utils/request_id.py
packages/shared_utils/shared_utils/logger.py
packages/shared_utils/shared_utils/http_client.py
packages/shared_utils/shared_utils/object_id.py
packages/shared_utils/shared_utils/mongo_repository.py
packages/shared_utils/shared_utils/pagination.py
packages/shared_utils/shared_utils/dates.py
packages/shared_utils/shared_utils/safe_json.py
packages/shared_utils/shared_utils/image.py
packages/shared_utils/shared_utils/idempotency.py
packages/shared_utils/shared_utils/inmemory.py
```

These files provide app factory helpers, settings, errors, response wrappers, request IDs, logging, HTTP helpers, ObjectId validation, repository primitives, date handling, JSON safety, image validation, idempotency, and in-memory fallbacks.

### packages/service_auth/

Internal service-to-service security and user context authorization.

```text
packages/service_auth/pyproject.toml
packages/service_auth/service_auth/__init__.py
packages/service_auth/service_auth/service_tokens.py
packages/service_auth/service_auth/signatures.py
packages/service_auth/service_auth/user_context.py
packages/service_auth/service_auth/permissions.py
```

`service_tokens.py` builds/verifies signed headers. `signatures.py` contains HMAC primitives. `user_context.py` signs and decodes trusted user context. `permissions.py` contains role and ownership guards.

### packages/api_client/

External Python client package scaffold.

```text
packages/api_client/pyproject.toml
packages/api_client/api_client/__init__.py
packages/api_client/api_client/gateway_client.py
```

Provides a Python client surface for calling the API Gateway.

## infra/

Infrastructure for local Docker and school-hub development.

```text
infra/docker-compose.yml
```

Main local Compose stack: all services plus MongoDB, Redis, NATS, MinIO, and worker.

```text
infra/docker-compose.school-hub.yml
```

School hub Compose variant with local/hub configuration and optional Ollama.

```text
infra/docker/Dockerfile.gateway
infra/docker/Dockerfile.service
infra/docker/Dockerfile.worker
```

Docker images for gateway, regular services, and worker.

```text
infra/nats/nats.conf
```

NATS JetStream configuration.

```text
infra/mongo/init.js
```

MongoDB initialization script.

```text
infra/nginx/nginx.conf
```

Optional nginx reverse proxy configuration.

## scripts/

Operational and developer scripts.

```text
scripts/__init__.py
```

Makes `scripts` importable when needed.

```text
scripts/create_indexes.py
```

Creates MongoDB indexes for each service-owned database.

```text
scripts/seed.py
```

Seeds demo users, school, class, lesson, assignment, Commons records, reviewer, and admin data when enabled.

```text
scripts/generate_openapi.py
```

Generates `docs/openapi.json` from the API Gateway app.

```text
scripts/validate_events.py
```

Validates event subject contracts.

```text
scripts/smoke_test.py
```

Basic end-to-end smoke checks against a running stack.

## docs/

Project documentation.

```text
docs/ARCHITECTURE.md
docs/SERVICES.md
docs/API.md
docs/EVENTS.md
docs/DATABASE.md
docs/AI_RUNTIME.md
docs/OFFLINE_SYNC.md
docs/OFFLINE_SQLITE.md
docs/SCHOOL_HUB.md
docs/SECURITY.md
docs/DEPLOYMENT.md
docs/TESTING.md
docs/openapi.json
docs/DIRECTORY_STRUCTURE.md
```

The markdown files explain architecture, service ownership, API gateway behavior, event contracts, database ownership, AI runtime modes, offline sync, school hub deployment, security, deployment, and testing. `openapi.json` is generated API documentation. This file explains the repository layout.

## tests/

Cross-cutting tests.

```text
tests/unit/__init__.py
tests/unit/test_contracts.py
```

Unit and contract tests for schemas, event validation, service authentication, AI mock output, image validation, `.kvpack`, ObjectId handling, JWT/password helpers, and sync conflict merging.

## Reading A Service

When you open any service, read it in this order:

1. `env.py` to see database name, port, and settings.
2. `server.py` to see which routes are included.
3. `routes/internal_routes.py` or route group files to see the API surface.
4. `service/*.py` to understand business rules.
5. `repository/*.py` to see how its own MongoDB collections are used.
6. `events/*.py` to understand what it publishes or consumes.

## Request Flow Example

```text
Teacher app
  -> apps/api_gateway/app/routes/teacher_routes.py
  -> apps/api_gateway/app/clients/lesson_client.py
  -> apps/lesson_service/app/routes/internal_routes.py
  -> apps/lesson_service/app/service/lesson_generation_service.py
  -> packages/shared_events/shared_events/event_bus.py
  -> apps/ai_service/app/service/ai_service.py
  -> apps/ai_service/app/adapters/mock_adapter.py or gemini_adapter.py
  -> apps/lesson_service/app/service/lesson_service.py
  -> apps/notification_service/app/service/notification_service.py
```

That is the central AetherLearn flow: secure gateway request, domain service ownership, event-driven generation, honest AI trace, and notification.
