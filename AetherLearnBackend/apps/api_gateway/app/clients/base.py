from __future__ import annotations

from typing import Any

import httpx
from service_auth import UserContext
from service_auth.service_tokens import build_service_headers
from shared_utils.errors import RemoteAppError, ServiceUnavailableError


class InternalServiceClient:
    def __init__(self, base_url: str, service_name: str, secret: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_name = service_name
        self.secret = secret

    async def request(
        self,
        method: str,
        path: str,
        *,
        request_id: str,
        json: Any | None = None,
        params: dict[str, Any] | None = None,
        user_context: UserContext | None = None,
    ) -> Any:
        headers = build_service_headers(
            self.service_name,
            self.secret,
            method,
            path,
            request_id=request_id,
            body=json,
            user_context=user_context,
        )
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.request(
                    method,
                    f"{self.base_url}{path}",
                    json=json,
                    params=params,
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise ServiceUnavailableError(
                "Internal service unavailable", {"serviceUrl": self.base_url}
            ) from exc
        if response.status_code >= 400:
            try:
                details = response.json()
            except ValueError:
                details = {"body": response.text}
            error = details.get("error") if isinstance(details, dict) else None
            if isinstance(error, dict):
                raise RemoteAppError(
                    error.get("code", "SERVICE_UNAVAILABLE"),
                    error.get("message", "Internal service error"),
                    status_code=response.status_code,
                    details=error.get("details", {}),
                )
            raise ServiceUnavailableError(
                "Internal service returned an error",
                {"status": response.status_code, "details": details},
            )
        return response.json()
