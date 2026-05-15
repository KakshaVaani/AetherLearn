from __future__ import annotations

from typing import Any

import httpx


class AetherLearnGatewayClient:
    def __init__(self, base_url: str, access_token: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.client = httpx.AsyncClient(timeout=30.0)

    def _headers(self) -> dict[str, str]:
        if not self.access_token:
            return {}
        return {"Authorization": f"Bearer {self.access_token}"}

    async def get(self, path: str, **params: Any) -> dict[str, Any]:
        response = await self.client.get(
            f"{self.base_url}{path}", params=params, headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    async def post(self, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        response = await self.client.post(
            f"{self.base_url}{path}", json=payload or {}, headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    async def aclose(self) -> None:
        await self.client.aclose()
