from __future__ import annotations

import base64
import hashlib
import hmac
from io import BytesIO

import pytest
from offline_sqlite import OfflineSQLiteStore
from PIL import Image
from service_auth import UserContext, decode_user_context
from service_auth.service_tokens import build_service_headers
from shared_events import SUBJECTS, EventEnvelope, validate_subject
from shared_schemas import (
    GenerateFromTextInput,
    LocalSyncStatus,
    OfflineEntityType,
    RuntimeMode,
    SchemaStatus,
    SubmitAssignmentRequest,
    SyncOperationType,
)
from shared_utils.env import BaseServiceSettings
from shared_utils.errors import ValidationAppError
from shared_utils.image import validate_image_upload
from shared_utils.inmemory import InMemoryRepository
from shared_utils.object_id import new_id, validate_object_id

from apps.ai_service.app.adapters.mock_adapter import MockAdapter
from apps.assignment_service.app.repository.assignment_repository import AssignmentRepository
from apps.assignment_service.app.repository.progress_repository import ProgressRepository
from apps.assignment_service.app.service.progress_service import ProgressService
from apps.auth_service.app.security.jwt import create_jwt, decode_jwt
from apps.auth_service.app.security.password import hash_password, verify_password
from apps.export_service.app.kvpack.builder import build_kvpack
from apps.export_service.app.kvpack.validator import validate_kvpack
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

    rows = await assignment_repo.list_for_student("student-1", classroom_ids=["class-1"])
    access = await assignment_repo.list_for_lesson_student(
        "lesson-class",
        "student-1",
        classroom_ids=["class-1"],
    )

    assert len(rows) == 1
    assert rows[0]["lessonId"] == "lesson-class"
    assert len(access) == 1
