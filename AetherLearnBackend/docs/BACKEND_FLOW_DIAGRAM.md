# AetherLearn Backend Flow Diagram

This diagram is based on the current backend code structure: FastAPI API Gateway,
internal service routes, shared auth/signature packages, MongoDB ownership,
NATS event contracts, Redis rate limiting, and MinIO/S3 storage.

## 1. Whole Backend Architecture

```mermaid
flowchart TB
  %% Public clients
  subgraph Clients["Public Clients"]
    Mobile["Mobile App"]
    AdminWeb["Admin / Wired Web UI"]
    OfflineSQLite["Client SQLite Cache + Queue"]
  end

  %% Public edge
  subgraph Edge["Public Edge"]
    Gateway["API Gateway :8000<br/>/api/* routes<br/>JWT verification<br/>role guards<br/>response wrapper"]
    GatewayMiddleware["Gateway Middleware<br/>request id<br/>CORS<br/>rate limit<br/>error normalization"]
  end

  %% Shared packages
  subgraph Shared["Shared Packages"]
    SharedSchemas["shared_schemas<br/>Pydantic contracts"]
    ServiceAuth["service_auth<br/>HMAC service headers<br/>signed user context"]
    SharedUtils["shared_utils<br/>app factory<br/>responses<br/>Mongo repository<br/>request ids"]
    SharedEvents["shared_events<br/>event envelope<br/>subjects<br/>EventBus"]
    OfflinePkg["offline_sqlite<br/>reference schema/store"]
    ApiClient["api_client<br/>gateway client scaffold"]
  end

  %% Internal HTTP services
  subgraph Services["Internal FastAPI Services"]
    Auth["Auth Service :8001<br/>users, passwords, JWTs,<br/>refresh tokens"]
    School["School Service :8002<br/>schools, classrooms,<br/>subjects, enrollments,<br/>join codes"]
    Lesson["Lesson Service :8003<br/>lesson packs, versions,<br/>generation state,<br/>access codes"]
    AI["AI Service :8004<br/>AI runtime router,<br/>prompts, validation,<br/>trace, Q&A"]
    Assignment["Assignment Service :8005<br/>assignments, progress,<br/>lesson access claims"]
    Commons["Commons Service :8006<br/>public lessons, search,<br/>collections, saves,<br/>forks, reports"]
    Review["Review Service :8007<br/>moderation queue,<br/>checklists, decisions,<br/>reports"]
    Sync["Sync Service :8008<br/>offline push/pull,<br/>operation log,<br/>conflict handling"]
    Export["Export Service :8009<br/>Markdown, PDF,<br/>.kvpack import/export"]
    Notify["Notification Service :8010<br/>notifications,<br/>push tokens"]
    Storage["Storage Service :8011<br/>object metadata,<br/>signed URLs,<br/>storage drivers"]
  end

  %% Background
  subgraph Background["Background Processing"]
    Worker["Worker<br/>event consumers<br/>cleanup/index jobs"]
  end

  %% Infrastructure
  subgraph Infra["Infrastructure"]
    Redis[("Redis :6379<br/>gateway rate limit")]
    NATS[("NATS JetStream :4222<br/>AETHERLEARN stream")]
    Mongo[("MongoDB :27017<br/>one database per service")]
    ObjectStore[("MinIO / S3 / Local Storage<br/>objects and assets")]
    AIRuntime["AI Runtime<br/>Gemini / Ollama / Local Hub / Mock"]
  end

  Mobile --> Gateway
  AdminWeb --> Gateway
  OfflineSQLite --> Gateway

  Gateway --> GatewayMiddleware
  GatewayMiddleware --> Auth
  GatewayMiddleware --> School
  GatewayMiddleware --> Lesson
  GatewayMiddleware --> AI
  GatewayMiddleware --> Assignment
  GatewayMiddleware --> Commons
  GatewayMiddleware --> Review
  GatewayMiddleware --> Sync
  GatewayMiddleware --> Export
  GatewayMiddleware --> Notify
  GatewayMiddleware --> Storage

  GatewayMiddleware -. uses .-> Redis
  Gateway -. imports .-> SharedSchemas
  Gateway -. uses .-> ServiceAuth
  Gateway -. uses .-> SharedUtils

  Auth -. uses .-> SharedSchemas
  School -. uses .-> SharedSchemas
  Lesson -. uses .-> SharedSchemas
  AI -. uses .-> SharedSchemas
  Assignment -. uses .-> SharedSchemas
  Commons -. uses .-> SharedSchemas
  Review -. uses .-> SharedSchemas
  Sync -. uses .-> SharedSchemas
  Export -. uses .-> SharedSchemas
  Notify -. uses .-> SharedSchemas
  Storage -. uses .-> SharedSchemas

  Auth --> Mongo
  School --> Mongo
  Lesson --> Mongo
  AI --> Mongo
  Assignment --> Mongo
  Commons --> Mongo
  Review --> Mongo
  Sync --> Mongo
  Export --> Mongo
  Notify --> Mongo
  Storage --> Mongo

  Storage --> ObjectStore
  Export --> ObjectStore
  AI --> AIRuntime

  Auth -. events .-> NATS
  School -. events .-> NATS
  Lesson -. events .-> NATS
  AI -. events .-> NATS
  Assignment -. events .-> NATS
  Commons -. events .-> NATS
  Review -. events .-> NATS
  Sync -. events .-> NATS
  Export -. events .-> NATS
  Notify -. events .-> NATS
  Worker -. publish .-> NATS
  NATS -. deliver .-> Worker

  NATS -. dead letters .-> NATS
  SharedEvents -. defines .-> NATS
  OfflinePkg -. reference .-> OfflineSQLite
  ApiClient -. calls .-> Gateway
```

## 2. Public Route To Internal Service Map

```mermaid
flowchart LR
  Client["Client"] --> Gateway["API Gateway"]

  Gateway --> AuthRoutes["/api/auth/*"]
  Gateway --> TeacherRoutes["/api/teacher/*"]
  Gateway --> StudentRoutes["/api/student/*"]
  Gateway --> CommonsRoutes["/api/commons/*"]
  Gateway --> ReviewRoutes["/api/review/*"]
  Gateway --> SyncRoutes["/api/sync/*"]
  Gateway --> ExportRoutes["/api/export/*<br/>/api/import/*"]
  Gateway --> StatusRoutes["/api/health<br/>/api/status"]

  AuthRoutes --> Auth["Auth Service<br/>/internal/auth/*"]

  TeacherRoutes --> School["School Service<br/>classes, students, join codes"]
  TeacherRoutes --> Lesson["Lesson Service<br/>drafts, packs, status, edits"]
  TeacherRoutes --> AI["AI Service<br/>analyze image, generate text"]
  TeacherRoutes --> Assignment["Assignment Service<br/>assignments, progress"]
  TeacherRoutes --> Review["Review Service<br/>Commons review item"]
  TeacherRoutes --> Export["Export Service<br/>Markdown, .kvpack"]

  StudentRoutes --> School
  StudentRoutes --> Assignment
  StudentRoutes --> Lesson
  StudentRoutes --> AI

  CommonsRoutes --> Commons["Commons Service<br/>search, public lesson,<br/>save, fork, report"]
  ReviewRoutes --> Review
  SyncRoutes --> Sync["Sync Service<br/>push, pull, status"]
  ExportRoutes --> Export

  StatusRoutes --> Auth
  StatusRoutes --> School
  StatusRoutes --> Lesson
  StatusRoutes --> AI
  StatusRoutes --> Assignment
  StatusRoutes --> Commons
  StatusRoutes --> Review
  StatusRoutes --> Sync
  StatusRoutes --> Export
  StatusRoutes --> Notify["Notification Service"]
  StatusRoutes --> Storage["Storage Service"]
```

## 3. Request Security Flow

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant Gateway as API Gateway
  participant Auth as Auth Service
  participant Internal as Internal Service

  Client->>Gateway: Public /api request with Bearer JWT
  Gateway->>Auth: POST /internal/auth/service-context
  Note over Gateway,Auth: HMAC service signature headers
  Auth-->>Gateway: Signed trusted user context data
  Gateway->>Gateway: Apply role guard<br/>teacher/student/reviewer/authenticated
  Gateway->>Internal: /internal/* request
  Note over Gateway,Internal: HMAC service signature + X-User-Context
  Internal->>Internal: Verify service signature<br/>verify signed user context
  Internal-->>Gateway: Domain response
  Gateway-->>Client: { ok, data, requestId }
```

## 4. Teacher Lesson Generation Flow

```mermaid
sequenceDiagram
  autonumber
  participant Teacher as Teacher Client
  participant Gateway as API Gateway
  participant Lesson as Lesson Service
  participant AI as AI Service
  participant Runtime as AI Runtime
  participant Mongo as MongoDB

  Teacher->>Gateway: POST /api/teacher/lessons/from-text
  Gateway->>Lesson: POST /internal/lessons/create-draft
  Lesson->>Mongo: Insert draft in lesson_packs
  Lesson-->>Gateway: Draft lesson id
  Gateway->>AI: POST /internal/ai/generate-from-text
  AI->>Runtime: Route to Gemini/Ollama/Local Hub/Mock
  Runtime-->>AI: Generated lesson pack + trace
  AI->>Mongo: Store generation and trace
  AI-->>Gateway: Validated LessonPack
  Gateway->>Lesson: POST /internal/lessons/{id}/apply-generation-result
  Lesson->>Mongo: Save final pack/version/status
  Lesson-->>Gateway: Lesson pack
  Gateway-->>Teacher: 201 { ok, data: lessonPack }
```

Image generation uses the same shape, except `/api/teacher/lessons/analyze`
creates the draft and generation request first, then the gateway runs the image
analysis in a background task before applying the AI result to the lesson.

## 5. Class, Assignment, Student Learning, And Q&A Flow

```mermaid
sequenceDiagram
  autonumber
  participant Teacher
  participant Student
  participant Gateway
  participant School as School Service
  participant Lesson as Lesson Service
  participant Assignment as Assignment Service
  participant AI as AI Service
  participant Mongo as MongoDB

  Teacher->>Gateway: POST /api/teacher/classes
  Gateway->>School: POST /internal/teacher/{teacherId}/classes
  School->>Mongo: Create classroom/subject records
  School-->>Gateway: Classroom

  Teacher->>Gateway: POST /api/teacher/lessons/{lessonId}/assign
  Gateway->>Assignment: POST /internal/assignments
  Assignment->>Mongo: Create assignments + progress shells
  Assignment-->>Gateway: Assignment result

  Student->>Gateway: GET /api/student/lessons/{lessonId}
  Gateway->>Assignment: GET access for student/lesson
  Assignment-->>Gateway: Access + progress
  Gateway->>Lesson: GET lesson pack
  Lesson-->>Gateway: Lesson pack
  Gateway-->>Student: Lesson + access

  Student->>Gateway: POST /api/student/lessons/{lessonId}/ask
  Gateway->>Lesson: GET lesson pack
  Gateway->>AI: POST /internal/ai/ask
  AI-->>Gateway: Answer from lesson context
  Gateway->>Assignment: PATCH progress askedQuestion=true
  Assignment->>Mongo: Update student_progress
  Gateway-->>Student: AI answer
```

## 6. Commons Review And Publishing Flow

```mermaid
sequenceDiagram
  autonumber
  participant Teacher
  participant Reviewer
  participant Gateway
  participant Lesson as Lesson Service
  participant Review as Review Service
  participant Commons as Commons Service
  participant Mongo as MongoDB
  participant NATS as NATS JetStream

  Teacher->>Gateway: POST /api/teacher/lessons/{id}/submit-commons
  Gateway->>Lesson: POST /internal/lessons/{id}/submit-commons
  Lesson->>Mongo: Mark submitted_to_commons
  Lesson-->>NATS: LessonSubmittedToCommons
  Gateway->>Review: GET /internal/review/lessons/{id}
  Review->>Mongo: Create/load review record
  Gateway-->>Teacher: Submission status

  Reviewer->>Gateway: GET /api/review/pending
  Gateway->>Review: GET /internal/review/pending
  Review-->>Gateway: Pending moderation queue

  Reviewer->>Gateway: POST /api/review/lessons/{id}/approve
  Gateway->>Review: POST /internal/review/lessons/{id}/approve
  Review->>Mongo: Store decision/checklist
  Review-->>NATS: CommonsReviewApproved
  Review-->>Gateway: Approval result

  Gateway->>Commons: Public APIs use Commons search/read/save/fork/report
  Commons->>Mongo: commons_lessons, collections, forks, reports
```

## 7. Offline Sync Flow

```mermaid
sequenceDiagram
  autonumber
  participant Client as Mobile Client
  participant SQLite as Local SQLite
  participant Gateway
  participant Sync as Sync Service
  participant Mongo as MongoDB

  Client->>Gateway: GET /api/sync/status
  Gateway->>Sync: GET /internal/sync/status
  Sync-->>Gateway: SQLite schema version + policy
  Gateway-->>Client: Offline capability metadata

  Client->>SQLite: Queue local operations<br/>operationId + idempotencyKey
  Client->>Gateway: POST /api/sync/push
  Gateway->>Sync: POST /internal/sync/push
  Sync->>Mongo: Store sync_operations/device_states
  Sync->>Sync: Idempotency + conflict checks
  Sync-->>Gateway: Per-operation results + cursor
  Gateway-->>Client: Push results
  Client->>SQLite: Mark synced/failed/conflict

  Client->>Gateway: POST /api/sync/pull
  Gateway->>Sync: POST /internal/sync/pull
  Sync->>Mongo: Read changed records/cursors
  Sync-->>Gateway: Changes + conflicts + next cursor
  Gateway-->>Client: Pull response
  Client->>SQLite: Update local cache
```

## 8. Export, Import, Storage, And Events

```mermaid
flowchart TB
  Gateway["API Gateway"] --> Export["Export Service"]
  Gateway --> Storage["Storage Service"]
  Gateway --> Notify["Notification Service"]

  Export --> Markdown["Teacher/Student Markdown"]
  Export --> PDF["Worksheet/Homework PDF"]
  Export --> KvPack[".kvpack builder/importer/validator"]
  Export --> ExportDB[("aetherlearn_exports")]

  Storage --> Metadata[("aetherlearn_storage<br/>object_metadata")]
  Storage --> Drivers["Storage drivers"]
  Drivers --> Local["Local FS"]
  Drivers --> Minio["MinIO"]
  Drivers --> S3["S3 compatible"]

  Notify --> NotifyDB[("aetherlearn_notifications<br/>notifications, push_tokens")]

  Export -. export events .-> NATS[("NATS JetStream")]
  Notify -. notification events .-> NATS
  Worker["Worker"] -. consume jobs .-> NATS
  NATS -. deliver events .-> Worker
```

## 9. Database Ownership

```mermaid
flowchart LR
  Auth["Auth Service"] --> AuthDB[("aetherlearn_auth<br/>users, refresh_tokens, password_resets")]
  School["School Service"] --> SchoolDB[("aetherlearn_school<br/>schools, classrooms, class_subjects, enrollments")]
  Lesson["Lesson Service"] --> LessonDB[("aetherlearn_lessons<br/>lesson_packs, lesson_versions, access_codes")]
  AI["AI Service"] --> AiDB[("aetherlearn_ai<br/>generations, traces, prompts, tool_calls")]
  Assignment["Assignment Service"] --> AssignDB[("aetherlearn_assignments<br/>assignments, student_progress, access_claims")]
  Commons["Commons Service"] --> CommonsDB[("aetherlearn_commons<br/>commons_lessons, collections, forks, reports")]
  Review["Review Service"] --> ReviewDB[("aetherlearn_review<br/>commons_reviews, decisions, moderation_reports")]
  Sync["Sync Service"] --> SyncDB[("aetherlearn_sync<br/>operations, device_states, cursors, hub_sync")]
  Export["Export Service"] --> ExportDB[("aetherlearn_exports<br/>export_jobs, kvpack_manifests")]
  Notify["Notification Service"] --> NotifyDB[("aetherlearn_notifications<br/>notifications, push_tokens")]
  Storage["Storage Service"] --> StorageDB[("aetherlearn_storage<br/>object_metadata")]
```

## 10. One-Line Mental Model

```text
Client -> API Gateway -> signed internal HTTP -> domain service -> owned MongoDB
                  |                      |
                  |                      +-> optional NATS event -> worker/other service
                  +-> normalized { ok, data/error, requestId } response
```
