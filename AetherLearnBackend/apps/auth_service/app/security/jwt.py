from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt
from shared_utils.errors import UnauthorizedError


def create_jwt(
    *,
    subject: str,
    secret: str,
    ttl: timedelta,
    token_type: str,
    claims: dict[str, Any],
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "jti": str(uuid4()),
        "typ": token_type,
        **claims,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_jwt(token: str, secret: str, *, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid token") from exc
    if payload.get("typ") != expected_type:
        raise UnauthorizedError("Invalid token type")
    return payload
