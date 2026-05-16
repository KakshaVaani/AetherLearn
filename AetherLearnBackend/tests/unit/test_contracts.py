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
    CreateAssignmentRequest,
    GenerateFromTextInput,
    LocalSyncStatus,
    OfflineEntityType,
    RuntimeMode,
    SchemaStatus,
    SubmitAssignmentRequest,
    SyncOperationType,
)
from shared_utils.env import BaseServiceSettings
from shared_utils.errors import ForbiddenError, ValidationAppError
from shared_utils.image import validate_image_upload
from shared_utils.inmemory import InMemoryRepository
from shared_utils.object_id import new_id, validate_object_id

from apps.ai_service.app.adapters.mock_adapter import MockAdapter
from apps.ai_service.app.validators import apply_generation_context, validate_lesson_pack
from apps.api_gateway.app.routes.teacher_routes import (
    AssignLessonRequest,
    _assignment_target_classroom,
)
from apps.assignment_service.app.repository.assignment_repository import AssignmentRepository
from apps.assignment_service.app.repository.progress_repository import ProgressRepository
from apps.assignment_service.app.service.assignment_service import AssignmentService
from apps.assignment_service.app.service.progress_service import ProgressService
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
    assert payload.questions[0].prompt == "What do plants release?"


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
    assert assignment.answer_mode == "text"
    assert assignment.versions == ["Standard", "Dyslexia Friendly"]
    assert assignment.questions[0].prompt == "Edited question?"
    assert rows[0]["questions"][0]["prompt"] == "Edited question?"


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
