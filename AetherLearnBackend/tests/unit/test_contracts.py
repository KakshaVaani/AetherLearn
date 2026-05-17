from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import UTC, datetime
from io import BytesIO

import httpx
import pytest
from offline_sqlite import OfflineSQLiteStore
from PIL import Image
from service_auth import UserContext, decode_user_context
from service_auth.service_tokens import build_service_headers
from service_auth.signatures import body_hash
from shared_events import SUBJECTS, EventEnvelope, validate_subject
from shared_schemas import (
    AssignmentQuestion,
    CreateAssignmentRequest,
    GenerateAssignmentDraftInput,
    GenerateAssignmentDraftOutput,
    GenerateFromTextInput,
    LocalSyncStatus,
    OfflineEntityType,
    RuntimeMode,
    SchemaStatus,
    SubmitAssignmentRequest,
    SyncOperationType,
    SyncPullRequest,
)
from shared_utils.env import BaseServiceSettings
from shared_utils.errors import ForbiddenError, ValidationAppError
from shared_utils.http_client import build_service_headers as build_http_client_headers
from shared_utils.image import validate_image_upload
from shared_utils.inmemory import InMemoryRepository
from shared_utils.object_id import new_id, validate_object_id

from apps.ai_service.app.adapters.assignment_draft_repair import repair_assignment_draft
from apps.ai_service.app.adapters.mock_adapter import MockAdapter
from apps.ai_service.app.prompts import (
    source_pack_prompt,
    student_pack_prompt,
    teacher_pack_prompt,
)
from apps.ai_service.app.validators import (
    apply_generation_context,
    compose_lesson_pack_from_parts,
    repair_source_understanding,
    repair_student_access_pack,
    repair_teacher_pack,
    validate_lesson_pack,
)
from apps.api_gateway.app.clients.base import InternalServiceClient
from apps.api_gateway.app.routes.teacher_routes import (
    AssignLessonRequest,
    _assignment_target_classroom,
)
from apps.assignment_service.app.repository.assignment_repository import AssignmentRepository
from apps.assignment_service.app.repository.progress_repository import ProgressRepository
from apps.assignment_service.app.service.assignment_service import AssignmentService
from apps.assignment_service.app.service.progress_service import ProgressService
from apps.auth_service.app.env import Settings as AuthSettings
from apps.auth_service.app.security.jwt import create_jwt, decode_jwt
from apps.auth_service.app.security.password import hash_password, verify_password
from apps.export_service.app.kvpack.builder import build_kvpack
from apps.export_service.app.kvpack.validator import validate_kvpack
from apps.lesson_service.app.repository.lesson_access_code_repository import (
    LessonAccessCodeRepository,
)
from apps.lesson_service.app.repository.lesson_repository import LessonRepository
from apps.lesson_service.app.service.lesson_service import LessonService
from apps.storage_service.app.drivers.local_driver import LocalStorageDriver
from apps.sync_service.app.conflict.progress_merge import true_wins_merge
from apps.sync_service.app.repository.device_state_repository import DeviceStateRepository
from apps.sync_service.app.repository.sync_operation_repository import SyncOperationRepository
from apps.sync_service.app.service.sync_service import SyncService


@pytest.mark.asyncio
async def test_mock_adapter_returns_honest_complete_lesson_pack() -> None:
    pack = await MockAdapter().generate_from_text(
        GenerateFromTextInput(
            text="Photosynthesis",
            settings={"subject": "Science", "gradeBand": "Class 7"},
            teacher_id=new_id(),
        )
    )
    assert pack.teacher_pack.lesson_objective
    assert pack.student_access_pack.screen_reader_summary
    assert pack.trace.runtime == RuntimeMode.MOCK
    assert pack.trace.hosted_api_used is False
    assert pack.trace.schema_status == SchemaStatus.PASSED
    assert "Mock" in pack.confidence_notes.teacher_review_warnings[0]


@pytest.mark.asyncio
async def test_mock_assignment_draft_honors_question_type() -> None:
    pack = await MockAdapter().generate_from_text(
        GenerateFromTextInput(
            text="Photosynthesis",
            settings={"subject": "Science", "gradeBand": "Class 7"},
            teacher_id=new_id(),
        )
    )

    mcq = await MockAdapter().generate_assignment_draft(
        GenerateAssignmentDraftInput(lesson_pack=pack, question_type="mcq")
    )
    long_answer = await MockAdapter().generate_assignment_draft(
        GenerateAssignmentDraftInput(lesson_pack=pack, question_type="long_answer")
    )

    assert mcq.answer_mode == "mcq"
    assert all(len(question.options) == 4 for question in mcq.questions)
    assert all("Answer from the lesson notes" not in question.options for question in mcq.questions)
    assert long_answer.answer_mode == "long_answer"
    assert all(question.options == [] for question in long_answer.questions)
    assert "paragraph" in long_answer.questions[0].prompt.lower()


@pytest.mark.asyncio
async def test_mcq_assignment_repair_replaces_empty_options() -> None:
    pack = await MockAdapter().generate_from_text(
        GenerateFromTextInput(
            text="Photosynthesis",
            settings={"subject": "Science", "gradeBand": "Class 7"},
            teacher_id=new_id(),
        )
    )
    payload = GenerateAssignmentDraftInput(lesson_pack=pack, question_type="mcq")
    repaired = repair_assignment_draft(
        payload,
        GenerateAssignmentDraftOutput(
            title="Photosynthesis Assignment",
            instructions="Choose the best answer.",
            answer_mode="mcq",
            questions=[AssignmentQuestion(id="q1", prompt="What is photosynthesis?", options=[])],
        ),
    )

    assert repaired.answer_mode == "mcq"
    assert len(repaired.questions[0].options) == 4
    assert "Answer from the lesson notes" not in repaired.questions[0].options


@pytest.mark.asyncio
async def test_lesson_generation_preserves_grade_class_scope() -> None:
    service = LessonService(
        LessonRepository(InMemoryRepository()),
        LessonAccessCodeRepository(InMemoryRepository()),
    )
    draft = await service.create_draft(
        {
            "title": "Fractions",
            "createdBy": "teacher-1",
            "createdByRole": "teacher",
            "schoolId": "school-1",
            "classroomId": "grade-7-a",
            "classSubjectId": "grade-7-math",
            "subject": "Math",
            "gradeBand": "Grade 7",
            "language": "en",
        }
    )
    generated = await MockAdapter().generate_from_text(
        GenerateFromTextInput(
            text="Fractions",
            settings={"subject": "Science", "gradeBand": "Grade 8"},
            teacher_id="teacher-1",
            lesson_id=draft.id,
        )
    )

    updated = await service.apply_generation_result(draft.id, generated)

    assert updated.school_id == "school-1"
    assert updated.classroom_id == "grade-7-a"
    assert updated.class_subject_id == "grade-7-math"
    assert updated.subject == "Math"
    assert updated.grade_band == "Grade 7"


def test_password_hash_and_verify() -> None:
    hashed = hash_password("demo1234")
    assert verify_password("demo1234", hashed)
    assert not verify_password("wrong-pass", hashed)


def test_jwt_create_and_verify() -> None:
    from datetime import timedelta

    token = create_jwt(
        subject="user-1",
        secret="secret",
        ttl=timedelta(minutes=5),
        token_type="access",
        claims={"role": "teacher", "tokenVersion": 1},
    )
    payload = decode_jwt(token, "secret", expected_type="access")
    assert payload["sub"] == "user-1"
    assert payload["role"] == "teacher"


def test_blank_service_port_env_uses_service_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SERVICE_PORT", "")
    settings = AuthSettings()
    assert settings.service_port == 8001


def test_service_auth_headers_include_signed_user_context() -> None:
    context = UserContext(user_id="u1", role="teacher", school_ids=["s1"], active_school_id="s1")
    headers = build_service_headers(
        "api-gateway",
        "secret",
        "POST",
        "/internal/example",
        request_id="req-1",
        body={"ok": True},
        user_context=context,
    )
    assert headers["X-Service-Name"] == "api-gateway"
    encoded = headers["X-User-Context"]
    expected = hmac.new(b"secret", encoded.encode("utf-8"), hashlib.sha256).hexdigest()
    assert hmac.compare_digest(expected, headers["X-User-Context-Signature"])
    assert decode_user_context(encoded).user_id == "u1"


def test_body_hash_canonicalizes_datetime_values() -> None:
    timestamp = datetime(2026, 5, 17, 12, 30, tzinfo=UTC)
    payload = {"createdAt": timestamp, "nested": {"updatedAt": timestamp}}
    expected = {
        "createdAt": timestamp.isoformat(),
        "nested": {"updatedAt": timestamp.isoformat()},
    }
    assert body_hash(payload) == body_hash(expected)


def test_shared_http_client_headers_handle_datetime_bodies() -> None:
    timestamp = datetime(2026, 5, 17, 12, 30, tzinfo=UTC)
    headers = build_http_client_headers(
        "sync-service",
        "secret",
        "POST",
        "/internal/sync/push",
        request_id="req-1",
        body={"timestamp": timestamp},
        user_context={"generatedAt": timestamp},
    )
    assert headers["X-Service-Name"] == "sync-service"
    assert headers["X-Service-Signature"]
    assert headers["X-User-Context"]


@pytest.mark.asyncio
async def test_internal_service_client_sends_canonical_json(monkeypatch: pytest.MonkeyPatch) -> None:
    timestamp = datetime(2026, 5, 17, 12, 30, tzinfo=UTC)
    captured: dict[str, object] = {}

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self) -> DummyAsyncClient:
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def request(self, method: str, url: str, **kwargs) -> httpx.Response:
            captured["method"] = method
            captured["url"] = url
            captured.update(kwargs)
            return httpx.Response(200, json={"ok": True})

    import apps.api_gateway.app.clients.base as gateway_client_base

    monkeypatch.setattr(gateway_client_base.httpx, "AsyncClient", DummyAsyncClient)

    client = InternalServiceClient("http://sync-service:8008", "api-gateway", "secret")
    payload = {"createdAt": timestamp, "nested": {"updatedAt": timestamp}}
    response = await client.request(
        "POST",
        "/internal/sync/push",
        request_id="req-1",
        json=payload,
    )

    sent_json = captured["json"]
    assert response == {"ok": True}
    assert sent_json == {
        "createdAt": timestamp.isoformat(),
        "nested": {"updatedAt": timestamp.isoformat()},
    }
    assert body_hash(payload) == body_hash(sent_json)


def test_event_envelope_and_subjects() -> None:
    envelope = EventEnvelope(event_type="LessonGenerationRequested", producer="lesson-service")
    assert envelope.event_id
    assert SUBJECTS[envelope.event_type] == "lesson.generation.requested"
    assert validate_subject("lesson.generation.requested")


@pytest.mark.asyncio
async def test_kvpack_round_trip_validation() -> None:
    pack = await MockAdapter().generate_from_text(
        GenerateFromTextInput(
            text="Water Cycle", settings={"subject": "Science"}, teacher_id=new_id()
        )
    )
    content, manifest = build_kvpack(pack, exported_by="teacher-1")
    assert manifest["includesSourceImage"] is False
    result = validate_kvpack(content)
    assert result.ok
    assert result.manifest is not None
    assert result.manifest.lesson_id == pack.id


def test_sync_progress_true_wins_merge() -> None:
    merged = true_wins_merge(
        {"opened": True, "listened": False}, {"opened": False, "listened": True}
    )
    assert merged["opened"] is True
    assert merged["listened"] is True


def test_offline_sqlite_store_queues_progress_operation() -> None:
    store = OfflineSQLiteStore.connect()
    try:
        local_id = store.upsert_entity(
            entity_type=OfflineEntityType.LESSON,
            owner_user_id="student-1",
            server_id="lesson-1",
            payload={"id": "lesson-1", "title": "Water Cycle", "version": 1},
        )
        operation = store.queue_operation(
            user_id="student-1",
            device_id="device-1",
            operation_type=SyncOperationType.UPDATE_PROGRESS,
            entity_type=OfflineEntityType.PROGRESS,
            entity_id=local_id,
            payload={"lessonId": "lesson-1", "opened": True, "listened": True},
        )
        push_request = store.create_push_request(user_id="student-1", device_id="device-1")

        assert store.get_metadata("schemaVersion") == "1"
        entity = store.get_entity(local_id)
        assert entity is not None
        assert entity["syncStatus"] == LocalSyncStatus.SYNCED.value
        assert operation.operation_id == push_request.operations[0].operation_id
        assert push_request.operations[0].operation_type == SyncOperationType.UPDATE_PROGRESS
    finally:
        store.close()


@pytest.mark.asyncio
async def test_offline_sqlite_queue_round_trips_through_sync_service() -> None:
    store = OfflineSQLiteStore.connect()
    try:
        store.queue_operation(
            user_id="student-1",
            device_id="device-1",
            operation_type=SyncOperationType.UPDATE_PROGRESS,
            payload={"lessonId": "lesson-1", "completed": True},
            idempotency_key="idem-1",
        )
        service = SyncService(
            SyncOperationRepository(InMemoryRepository()),
            DeviceStateRepository(InMemoryRepository()),
        )

        first_push = store.create_push_request(user_id="student-1", device_id="device-1")
        first_response = await service.push("student-1", first_push)
        store.apply_push_results(
            results=first_response["results"],
            cursor=first_response["cursor"],
        )

        duplicate_response = await service.push("student-1", first_push)

        assert store.get_cursor() == first_response["cursor"]
        assert store.pending_operations(user_id="student-1", device_id="device-1") == []
        assert first_response["results"][0].status == "processed"
        assert duplicate_response["results"][0].status == "duplicate"
        assert duplicate_response["results"][0].data["idempotent"] is True
    finally:
        store.close()


def test_local_first_sync_contract_includes_text_and_notes_operations() -> None:
    assert SyncOperationType.CREATE_LESSON_FROM_TEXT.value == "CREATE_LESSON_FROM_TEXT"
    assert SyncOperationType.UPDATE_LESSON.value == "UPDATE_LESSON"
    assert SyncOperationType.GENERATE_STUDENT_NOTE.value == "GENERATE_STUDENT_NOTE"
    assert OfflineEntityType.GENERATED_NOTE.value == "generated_note"


@pytest.mark.asyncio
async def test_push_then_pull_materializes_local_generated_work() -> None:
    store = OfflineSQLiteStore.connect()
    try:
        lesson_local_id = store.upsert_entity(
            entity_type=OfflineEntityType.LESSON,
            owner_user_id="teacher-1",
            payload={"id": "local-lesson-1", "title": "Plant Nutrition", "version": 1},
            local_id="local-lesson-1",
            sync_status=LocalSyncStatus.QUEUED,
        )
        store.queue_operation(
            user_id="teacher-1",
            device_id="device-1",
            operation_type=SyncOperationType.CREATE_LESSON_FROM_TEXT,
            entity_type=OfflineEntityType.LESSON,
            entity_id=lesson_local_id,
            payload={
                "lesson": {
                    "id": "local-lesson-1",
                    "title": "Plant Nutrition",
                    "trace": {
                        "runtime": "on-device",
                        "localOnly": True,
                        "hostedApiUsed": False,
                    },
                }
            },
            idempotency_key="lesson-text-1",
        )
        store.queue_operation(
            user_id="teacher-1",
            device_id="device-1",
            operation_type=SyncOperationType.UPDATE_LESSON,
            entity_type=OfflineEntityType.LESSON,
            entity_id=lesson_local_id,
            payload={
                "lesson": {
                    "id": "local-lesson-1",
                    "title": "Plant Nutrition Edited",
                    "status": "pending_review",
                    "trace": {
                        "runtime": "on-device",
                        "localOnly": True,
                        "hostedApiUsed": False,
                    },
                }
            },
            idempotency_key="lesson-update-1",
        )
        store.queue_operation(
            user_id="teacher-1",
            device_id="device-1",
            operation_type=SyncOperationType.GENERATE_STUDENT_NOTE,
            entity_type=OfflineEntityType.GENERATED_NOTE,
            entity_id="note-1",
            payload={"id": "note-1", "lessonId": "local-lesson-1", "text": "Local notes"},
            idempotency_key="note-1",
        )
        service = SyncService(
            SyncOperationRepository(InMemoryRepository()),
            DeviceStateRepository(InMemoryRepository()),
        )

        push_request = store.create_push_request(user_id="teacher-1", device_id="device-1")
        push_response = await service.push("teacher-1", push_request)
        pull_response = await service.pull(
            "teacher-1",
            SyncPullRequest(device_id="device-1", cursor=push_response["cursor"]),
        )

        assert all(result.ok for result in push_response["results"])
        assert pull_response["changes"]["lessons"][0]["title"] == "Plant Nutrition"
        assert pull_response["changes"]["lessons"][0]["trace"]["runtime"] == "on-device"
        assert pull_response["changes"]["lessons"][1]["title"] == "Plant Nutrition Edited"
        assert pull_response["changes"]["lessons"][1]["status"] == "pending_review"
        assert pull_response["changes"]["notes"][0]["text"] == "Local notes"
    finally:
        store.close()


def test_image_validation() -> None:
    output = BytesIO()
    Image.new("RGB", (800, 600), color="white").save(output, format="PNG")
    metadata = validate_image_upload(output.getvalue(), "image/png", max_mb=1)
    assert metadata["width"] == 800
    assert metadata["height"] == 600


def test_object_id_validation() -> None:
    value = new_id()
    assert validate_object_id(value) == value


def test_no_raw_source_in_kvpack_by_default() -> None:
    marker = base64.b64encode(b"raw-image").decode("ascii")
    assert marker


def test_production_settings_fail_closed() -> None:
    settings = BaseServiceSettings(
        app_env="production",
        internal_service_secret="change-me",
        jwt_access_secret="short",
        jwt_refresh_secret="change-me",
        auth_demo_mode=True,
        seed_demo_data=True,
    )

    errors = settings.validate_production_config()

    assert "INTERNAL_SERVICE_SECRET must be configured in production" in errors
    assert "JWT_ACCESS_SECRET should be at least 32 bytes for HS256/HMAC" in errors
    assert "AUTH_DEMO_MODE must be false in production" in errors
    assert "SEED_DEMO_DATA must be false in production" in errors


@pytest.mark.asyncio
async def test_local_storage_driver_blocks_path_traversal(tmp_path) -> None:
    driver = LocalStorageDriver(str(tmp_path))
    await driver.put("source/test.txt", b"ok", "text/plain")

    assert await driver.get("source/test.txt") == b"ok"

    with pytest.raises(ValidationAppError):
        await driver.put("../escape.txt", b"bad", "text/plain")


@pytest.mark.asyncio
async def test_student_assignment_submission_updates_progress() -> None:
    assignment_repo = AssignmentRepository(InMemoryRepository())
    progress_repo = ProgressRepository(InMemoryRepository())
    assignment = await assignment_repo.create(
        {
            "lessonId": "lesson-1",
            "teacherId": "teacher-1",
            "studentId": "student-1",
            "classroomId": "class-1",
            "status": "assigned",
        }
    )
    result = await ProgressService(progress_repo).submit_assignment(
        student_id="student-1",
        assignment_id=assignment["id"],
        assignments=assignment_repo,
        payload=SubmitAssignmentRequest(
            answers={"q1": "A"},
            score=100,
            correct_count=1,
            total_questions=1,
            weak_topics=[],
        ),
    )

    assert result["submitted"] is True
    assert result["progress"].completed is True
    assert result["progress"].score == 100


@pytest.mark.asyncio
async def test_student_assignment_list_includes_classroom_assignments() -> None:
    assignment_repo = AssignmentRepository(InMemoryRepository())
    await assignment_repo.create(
        {
            "lessonId": "lesson-class",
            "teacherId": "teacher-1",
            "studentId": None,
            "classroomId": "class-1",
            "status": "assigned",
        }
    )
    await assignment_repo.create(
        {
            "lessonId": "lesson-other-class",
            "teacherId": "teacher-1",
            "studentId": None,
            "classroomId": "class-2",
            "status": "assigned",
        }
    )

    rows = await assignment_repo.list_for_student("student-1", classroom_ids=["class-1"])
    access = await assignment_repo.list_for_lesson_student(
        "lesson-class",
        "student-1",
        classroom_ids=["class-1"],
    )
    denied_access = await assignment_repo.list_for_lesson_student(
        "lesson-other-class",
        "student-1",
        classroom_ids=["class-1"],
    )

    assert len(rows) == 1
    assert rows[0]["lessonId"] == "lesson-class"
    assert len(access) == 1
    assert denied_access == []


def test_class_scoped_lesson_rejects_mismatched_assignment_class() -> None:
    lesson = {"id": "lesson-1", "classroomId": "grade-7-a"}

    assert _assignment_target_classroom(lesson, None) == "grade-7-a"
    assert _assignment_target_classroom(lesson, "grade-7-a") == "grade-7-a"
    with pytest.raises(ValidationAppError):
        _assignment_target_classroom(lesson, "grade-8-a")


def test_teacher_assign_route_payload_does_not_require_lesson_id() -> None:
    payload = AssignLessonRequest.model_validate(
        {
            "classroomId": "grade-7-a",
            "title": "Photosynthesis Assignment",
            "answerMode": "text",
            "versions": ["Standard"],
            "questions": [{"id": "q1", "prompt": "What do plants release?"}],
        }
    )

    assert payload.classroom_id == "grade-7-a"
    assert payload.title == "Photosynthesis Assignment"
    assert payload.answer_mode == "short_answer"
    assert payload.questions[0].prompt == "What do plants release?"


def test_assignment_draft_request_normalizes_question_type() -> None:
    payload = GenerateAssignmentDraftInput.model_validate(
        {
            "lessonPack": MockAdapter()._pack(
                teacher_id="teacher-1",
                lesson_id="lesson-1",
                title="Photosynthesis",
                subject="Science",
                grade_band="Class 7",
                language="en",
                source="text",
            ),
            "questionType": "text",
        }
    )

    assert payload.question_type == "short_answer"


def test_generation_context_repair_fills_required_lesson_ownership_fields() -> None:
    repaired = apply_generation_context(
        {"title": "Respiration", "createdByRole": "teacher"},
        teacher_id="teacher-42",
        lesson_id="lesson-77",
    )
    assert repaired["id"] == "lesson-77"
    assert repaired["createdBy"] == "teacher-42"
    assert repaired["createdByRole"] == "teacher"


def test_generation_context_repair_validates_partial_gemma_lesson_pack() -> None:
    repaired = apply_generation_context(
        {
            "title": "Photosynthesis",
            "sourceUnderstanding": {
                "title": "Photosynthesis",
                "inferredTopic": "How plants make food",
            },
            "teacherPack": {
                "lessonObjective": "Explain photosynthesis.",
                "teacherExplanation": "Plants use sunlight, water, and carbon dioxide.",
                "lowResourceActivity": "Discuss examples from nearby plants.",
                "homework": "Answer two review questions.",
            },
            "studentAccessPack": {
                "listenFirstAudioScript": "Plants make food using sunlight.",
                "screenReaderSummary": "Photosynthesis helps plants make food.",
                "visualDescription": "A plant receives sunlight.",
            },
        },
        teacher_id="teacher-42",
        lesson_id="lesson-77",
        settings={"subject": "Science", "gradeBand": "7", "language": "en"},
        runtime="ollama",
        model="gemma4:e4b",
    )

    pack = validate_lesson_pack(repaired)

    assert pack.id == "lesson-77"
    assert pack.student_access_pack.simple_explanation
    assert pack.confidence_notes.teacher_review_warnings
    assert pack.trace.schema_status == "repaired"


def test_source_repair_flattens_nested_list_fields_from_light_model() -> None:
    source = repair_source_understanding(
        {
            "sourceUnderstanding": {
                "title": "Photosynthesis",
                "inferredTopic": "How plants make food",
                "observedText": [["Plants use sunlight."], {"text": "Leaves take in carbon dioxide."}],
                "observedObjects": [{"title": "leaf diagram"}],
                "unclearAreas": [[], ["missing equation detail"]],
            }
        },
        settings={"language": "en"},
    )

    assert source.observed_text == ["Plants use sunlight.", "Leaves take in carbon dioxide."]
    assert source.observed_objects == ["leaf diagram"]
    assert source.unclear_areas == ["missing equation detail"]


def test_generation_context_repair_handles_non_object_model_text() -> None:
    repaired = apply_generation_context(
        {},
        teacher_id="teacher-42",
        lesson_id="lesson-77",
        settings={
            "title": "Photosynthesis Notes",
            "subject": "Science",
            "gradeBand": "7",
            "language": "en",
            "text": "Photosynthesis is how plants make food.",
        },
        runtime="ollama",
        model="gemma4:e4b",
        raw_model_response="Photosynthesis is a process plants use to make food.",
    )

    pack = validate_lesson_pack(repaired)

    assert pack.title == "Photosynthesis Notes"
    assert pack.trace.runtime == RuntimeMode.OLLAMA
    assert any(warning.code == "MODEL_JSON_REPAIRED" for warning in pack.trace.warnings)


def test_generation_context_repair_overrides_invalid_generated_metadata() -> None:
    repaired = apply_generation_context(
        {
            "title": None,
            "status": "done",
            "visibility": "everyone",
            "schemaVersion": None,
            "trace": {
                "runtime": "gemma",
                "model": None,
                "schemaStatus": "great",
                "warnings": ["trace was odd"],
            },
        },
        teacher_id="teacher-42",
        lesson_id="lesson-77",
        settings={"title": "Cells", "subject": "Science", "gradeBand": "8"},
        runtime="ollama",
        model="gemma4:e4b",
    )

    pack = validate_lesson_pack(repaired)

    assert pack.title == "Cells"
    assert pack.status == "generated"
    assert pack.visibility == "private"
    assert pack.trace.runtime == RuntimeMode.OLLAMA
    assert pack.trace.model == "gemma4:e4b"


def test_multi_call_lesson_composition_preserves_grade_class_scope() -> None:
    settings = {
        "title": "Vision Transformers",
        "subject": "Science",
        "gradeBand": "7",
        "language": "en",
        "schoolId": "school-1",
        "classroomId": "class-7a",
        "classSubjectId": "science-7a",
        "text": "Vision Transformers split an image into patches.",
    }
    source = repair_source_understanding(
        {
            "sourceUnderstanding": {
                "title": "Vision Transformers",
                "observedText": ["Images are split into patches."],
                "inferredTopic": "Vision Transformers",
            }
        },
        settings=settings,
    )
    teacher = repair_teacher_pack(
        {
            "teacherPack": {
                "lessonObjective": "Students explain how ViT uses image patches.",
                "teacherExplanation": "ViT treats image patches like tokens.",
                "boardPlan": ["Write image -> patches -> embeddings -> transformer."],
                "lowResourceActivity": "Cut a paper image into equal patches.",
                "worksheet": ["What is a patch in ViT?"],
                "answerKey": ["A small part of an image treated like a token."],
                "homework": "Review the patching process.",
                "differentiatedExplanations": ["Use a grid drawing for support."],
            }
        },
        source_understanding=source,
        settings=settings,
    )
    student = repair_student_access_pack(
        {},
        source_understanding=source,
        settings=settings,
    )

    pack = compose_lesson_pack_from_parts(
        source_understanding=source,
        teacher_pack=teacher,
        student_access_pack=student,
        teacher_id="teacher-demo",
        lesson_id="lesson-vit",
        settings=settings,
        runtime="ollama",
        model="gemma4:e4b",
        latency_ms=1234,
    )

    assert pack.id == "lesson-vit"
    assert pack.classroom_id == "class-7a"
    assert pack.class_subject_id == "science-7a"
    assert pack.subject == "Science"
    assert pack.grade_band == "7"
    assert pack.trace.schema_status == SchemaStatus.PASSED
    assert pack.teacher_pack.differentiated_explanations


def test_lesson_pack_prompts_are_positive_and_field_specific() -> None:
    source_prompt = source_pack_prompt(
        "{}",
        text="Plants make food using sunlight.",
        settings={"subject": "Science", "gradeBand": "7"},
    )
    teacher_prompt = teacher_pack_prompt(
        "{}",
        source_understanding={"title": "Photosynthesis", "inferredTopic": "Photosynthesis"},
        text="Plants make food using sunlight.",
        settings={"subject": "Science", "gradeBand": "7"},
    )
    student_prompt = student_pack_prompt(
        "{}",
        source_understanding={"title": "Photosynthesis", "inferredTopic": "Photosynthesis"},
        text="Plants make food using sunlight.",
        settings={"subject": "Science", "gradeBand": "7"},
    )
    combined = "\n".join([source_prompt, teacher_prompt, student_prompt])

    assert "Do not generate" not in combined
    assert "If the text is unclear" not in combined
    assert "success criteria" not in combined
    assert 'Return JSON only with one top-level field: "teacherPack"' in teacher_prompt
    assert "boardPlan: exactly 4 ordered board steps." in teacher_prompt
    assert 'starting with "Support:", "Core:", and "Challenge:"' in teacher_prompt
    assert "screenReaderSummary: detailed student notes" in student_prompt
    assert "listenFirstAudioScript: 3-5 short spoken sentences" in student_prompt
    assert "qnaContext" not in student_prompt
    assert "independenceTips" not in student_prompt
    assert "observedText: 5-10 short facts" in source_prompt


def test_repair_teacher_pack_fills_malformed_partial_output() -> None:
    source = repair_source_understanding(
        {},
        settings={"title": "Cells", "subject": "Science", "gradeBand": "8"},
    )
    teacher = repair_teacher_pack(
        {"teacherPack": {"lessonObjective": None, "boardPlan": "not-a-list"}},
        source_understanding=source,
        settings={"subject": "Science", "gradeBand": "8"},
    )

    assert teacher.lesson_objective
    assert teacher.board_plan
    assert teacher.differentiated_explanations


def test_repair_teacher_pack_normalizes_learner_support_text() -> None:
    source = repair_source_understanding(
        {"sourceUnderstanding": {"title": "Photosynthesis", "inferredTopic": "Photosynthesis"}},
        settings={"title": "Photosynthesis", "subject": "Science", "gradeBand": "7"},
    )
    teacher = repair_teacher_pack(
        {
            "teacherPack": {
                "differentiatedExplanations": [
                    (
                        "**Support (Struggling Learners):** Use physical actions for sunlight $\\to$ food "
                        "and breathing out $\\text{CO}_2$."
                    ),
                    "**Core (Grade Level):** Students list reactants and products.",
                    "**Challenge (Advanced Learners):** Explain limiting factors.",
                ]
            }
        },
        source_understanding=source,
        settings={"subject": "Science", "gradeBand": "7"},
    )

    assert [item.split(":", 1)[0] for item in teacher.differentiated_explanations] == [
        "Support",
        "Core",
        "Challenge",
    ]
    assert "**" not in "\n".join(teacher.differentiated_explanations)
    assert "$" not in "\n".join(teacher.differentiated_explanations)
    assert "\\text" not in "\n".join(teacher.differentiated_explanations)


def test_repair_student_pack_replaces_question_like_simple_explanation() -> None:
    source = repair_source_understanding(
        {"sourceUnderstanding": {"title": "Transformers", "inferredTopic": "Transformer models"}},
        settings={"title": "Transformers", "subject": "Science", "gradeBand": "7"},
    )
    student = repair_student_access_pack(
        {
            "studentAccessPack": {
                "screenReaderSummary": (
                    "Transformer models process information using attention. Attention helps the model "
                    "compare parts of the input and focus on the most useful relationships."
                ),
                "simpleExplanation": (
                    "1. Define Transformer and its main purpose in AI.\n"
                    "2. Explain the difference between sequential and parallel processing.\n"
                    "3. Describe the function of the attention mechanism."
                ),
            }
        },
        source_understanding=source,
        settings={"gradeBand": "7"},
    )

    assert "Define Transformer" not in student.simple_explanation
    assert "attention" in student.simple_explanation.lower()


@pytest.mark.asyncio
async def test_assignment_creation_persists_editable_draft_fields() -> None:
    assignment_repo = AssignmentRepository(InMemoryRepository())
    progress_repo = ProgressRepository(InMemoryRepository())

    created = await AssignmentService(assignment_repo, progress_repo).create(
        "teacher-1",
        CreateAssignmentRequest(
            lesson_id="lesson-1",
            classroom_id="grade-7-a",
            title="Edited Assignment",
            instructions="Answer in your notebook.",
            due_at="2026-05-20",
            answer_mode="text",
            versions=["Standard", "Dyslexia Friendly"],
            questions=[
                {
                    "id": "q1",
                    "prompt": "Edited question?",
                    "hint": "Use the lesson.",
                }
            ],
        ),
    )

    assignment = created[0]
    rows = await assignment_repo.list_for_student("student-1", classroom_ids=["grade-7-a"])

    assert assignment.title == "Edited Assignment"
    assert assignment.instructions == "Answer in your notebook."
    assert assignment.due_at == "2026-05-20"
    assert assignment.answer_mode == "short_answer"
    assert assignment.versions == ["Standard", "Dyslexia Friendly"]
    assert assignment.questions[0].prompt == "Edited question?"
    assert rows[0]["questions"][0]["prompt"] == "Edited question?"


@pytest.mark.asyncio
@pytest.mark.parametrize("answer_mode", ["mcq", "short_answer", "long_answer"])
async def test_assignment_creation_persists_supported_answer_modes(answer_mode: str) -> None:
    assignment_repo = AssignmentRepository(InMemoryRepository())
    progress_repo = ProgressRepository(InMemoryRepository())

    created = await AssignmentService(assignment_repo, progress_repo).create(
        "teacher-1",
        CreateAssignmentRequest(
            lesson_id=f"lesson-{answer_mode}",
            classroom_id="grade-7-a",
            answer_mode=answer_mode,
            questions=[
                {
                    "id": "q1",
                    "prompt": "Question?",
                    "options": ["A", "B", "C", "D"] if answer_mode == "mcq" else [],
                }
            ],
        ),
    )

    assert created[0].answer_mode == answer_mode


@pytest.mark.asyncio
async def test_classroom_assignment_submission_requires_student_class() -> None:
    assignment_repo = AssignmentRepository(InMemoryRepository())
    progress_repo = ProgressRepository(InMemoryRepository())
    assignment = await assignment_repo.create(
        {
            "lessonId": "lesson-class",
            "teacherId": "teacher-1",
            "studentId": None,
            "classroomId": "grade-7-a",
            "status": "assigned",
        }
    )

    with pytest.raises(ForbiddenError):
        await ProgressService(progress_repo).submit_assignment(
            student_id="student-1",
            assignment_id=assignment["id"],
            assignments=assignment_repo,
            payload=SubmitAssignmentRequest(answers={}, score=0),
            classroom_ids=["grade-8-a"],
        )
