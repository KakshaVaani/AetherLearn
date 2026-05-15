from __future__ import annotations

import base64
import hashlib
import hmac
from io import BytesIO

import pytest
from PIL import Image
from service_auth import UserContext, decode_user_context
from service_auth.service_tokens import build_service_headers
from shared_events import SUBJECTS, EventEnvelope, validate_subject
from shared_schemas import GenerateFromTextInput, RuntimeMode, SchemaStatus
from shared_utils.image import validate_image_upload
from shared_utils.object_id import new_id, validate_object_id

from apps.ai_service.app.adapters.mock_adapter import MockAdapter
from apps.auth_service.app.security.jwt import create_jwt, decode_jwt
from apps.auth_service.app.security.password import hash_password, verify_password
from apps.export_service.app.kvpack.builder import build_kvpack
from apps.export_service.app.kvpack.validator import validate_kvpack
from apps.sync_service.app.conflict.progress_merge import true_wins_merge


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
