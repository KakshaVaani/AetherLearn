from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Header, Request
from shared_utils.errors import UnauthorizedError

from .signatures import body_hash, sign_message, verify_fresh_timestamp, verify_signature
from .user_context import UserContext, decode_user_context, encode_user_context


def service_signature_message(
    service_name: str,
    timestamp: str,
    method: str,
    path: str,
    body: Any | None = None,
) -> str:
    return "\n".join([service_name, timestamp, method.upper(), path, body_hash(body)])


def build_service_headers(
    service_name: str,
    secret: str,
    method: str,
    path: str,
    *,
    request_id: str,
    body: Any | None = None,
    user_context: UserContext | dict | None = None,
) -> dict[str, str]:
    timestamp = datetime.now(UTC).isoformat()
    signature = sign_message(
        secret,
        service_signature_message(service_name, timestamp, method, path, body),
    )
    headers = {
        "X-Service-Name": service_name,
        "X-Service-Timestamp": timestamp,
        "X-Service-Signature": signature,
        "X-Request-Id": request_id,
    }
    if user_context is not None:
        encoded = encode_user_context(user_context)
        headers["X-User-Context"] = encoded
        headers["X-User-Context-Signature"] = sign_message(secret, encoded)
    return headers


async def verify_internal_request(
    request: Request,
    secret: str,
    x_service_name: str | None = Header(default=None, alias="X-Service-Name"),
    x_service_timestamp: str | None = Header(default=None, alias="X-Service-Timestamp"),
    x_service_signature: str | None = Header(default=None, alias="X-Service-Signature"),
) -> str:
    if not x_service_name or not x_service_timestamp or not x_service_signature:
        raise UnauthorizedError("Missing service authentication headers")
    verify_fresh_timestamp(x_service_timestamp)
    body = (
        await request.json()
        if request.headers.get("content-type", "").startswith("application/json")
        else {}
    )
    message = service_signature_message(
        x_service_name,
        x_service_timestamp,
        request.method,
        request.url.path,
        body,
    )
    if not verify_signature(secret, message, x_service_signature):
        raise UnauthorizedError("Invalid service signature")
    return x_service_name


async def verify_internal_request_from_headers(request: Request, secret: str) -> str:
    service_name = request.headers.get("X-Service-Name")
    timestamp = request.headers.get("X-Service-Timestamp")
    signature = request.headers.get("X-Service-Signature")
    if not service_name or not timestamp or not signature:
        raise UnauthorizedError("Missing service authentication headers")
    verify_fresh_timestamp(timestamp)
    body = (
        await request.json()
        if request.headers.get("content-type", "").startswith("application/json")
        else {}
    )
    message = service_signature_message(
        service_name, timestamp, request.method, request.url.path, body
    )
    if not verify_signature(secret, message, signature):
        raise UnauthorizedError("Invalid service signature")
    return service_name


def verify_user_context_headers(
    secret: str,
    encoded_context: str | None,
    signature: str | None,
    *,
    required: bool = True,
) -> UserContext | None:
    if not encoded_context or not signature:
        if required:
            raise UnauthorizedError("Missing user context")
        return None
    if not verify_signature(secret, encoded_context, signature):
        raise UnauthorizedError("Invalid user context signature")
    return decode_user_context(encoded_context)
