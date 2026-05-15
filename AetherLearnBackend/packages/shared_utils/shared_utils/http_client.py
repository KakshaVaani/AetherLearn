from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any

import httpx


class ServiceHttpClient:
    def __init__(self, base_url: str, service_name: str, secret: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_name = service_name
        self.secret = secret
        self.client = httpx.AsyncClient(timeout=30.0)

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: Any | None = None,
        params: dict[str, Any] | None = None,
        request_id: str,
        user_context: dict[str, Any] | None = None,
    ) -> httpx.Response:
        headers = build_service_headers(
            self.service_name,
            self.secret,
            method,
            path,
            request_id=request_id,
            body=json,
            user_context=user_context,
        )
        return await self.client.request(
            method,
            f"{self.base_url}{path}",
            json=json,
            params=params,
            headers=headers,
        )

    async def aclose(self) -> None:
        await self.client.aclose()


def build_service_headers(
    service_name: str,
    secret: str,
    method: str,
    path: str,
    *,
    request_id: str,
    body: Any | None = None,
    user_context: dict[str, Any] | None = None,
) -> dict[str, str]:
    timestamp = datetime.now(UTC).isoformat()
    body_bytes = json.dumps(body or {}, sort_keys=True, separators=(",", ":")).encode("utf-8")
    body_hash = hashlib.sha256(body_bytes).hexdigest()
    message = "\n".join([service_name, timestamp, method.upper(), path, body_hash])
    signature = hmac.new(
        secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    headers = {
        "X-Service-Name": service_name,
        "X-Service-Timestamp": timestamp,
        "X-Service-Signature": signature,
        "X-Request-Id": request_id,
    }
    if user_context is not None:
        context_json = json.dumps(user_context, sort_keys=True, separators=(",", ":"))
        context_b64 = base64.urlsafe_b64encode(context_json.encode("utf-8")).decode("ascii")
        context_sig = hmac.new(secret.encode("utf-8"), context_b64.encode("utf-8"), hashlib.sha256)
        headers["X-User-Context"] = context_b64
        headers["X-User-Context-Signature"] = context_sig.hexdigest()
    return headers
