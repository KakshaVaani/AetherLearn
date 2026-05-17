from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any

from fastapi.encoders import jsonable_encoder
from shared_utils.errors import UnauthorizedError


def body_hash(body: Any | None) -> str:
    canonical_body = jsonable_encoder(body or {})
    data = json.dumps(canonical_body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def sign_message(secret: str, message: str) -> str:
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_signature(secret: str, message: str, signature: str) -> bool:
    expected = sign_message(secret, message)
    return hmac.compare_digest(expected, signature)


def verify_fresh_timestamp(timestamp: str, max_skew_seconds: int = 300) -> None:
    try:
        parsed = datetime.fromisoformat(timestamp)
    except ValueError as exc:
        raise UnauthorizedError("Invalid service timestamp") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    delta = abs((datetime.now(UTC) - parsed.astimezone(UTC)).total_seconds())
    if delta > max_skew_seconds:
        raise UnauthorizedError("Stale service timestamp")
