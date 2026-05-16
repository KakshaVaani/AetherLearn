from __future__ import annotations

from .base import InternalServiceClient


class AuthClient(InternalServiceClient):
    async def signup(self, payload: dict, request_id: str):
        return await self.request(
            "POST", "/internal/auth/signup", json=payload, request_id=request_id
        )

    async def login(self, payload: dict, request_id: str):
        return await self.request(
            "POST", "/internal/auth/login", json=payload, request_id=request_id
        )

    async def refresh(self, payload: dict, request_id: str):
        return await self.request(
            "POST", "/internal/auth/refresh", json=payload, request_id=request_id
        )

    async def service_context(self, token: str, request_id: str):
        return await self.request(
            "POST", "/internal/auth/service-context", json={"token": token}, request_id=request_id
        )

    async def user(self, user_id: str, request_id: str):
        return await self.request("GET", f"/internal/auth/users/{user_id}", request_id=request_id)

    async def update_student_profile(self, user_id: str, payload: dict, request_id: str):
        return await self.request(
            "PATCH",
            f"/internal/auth/users/{user_id}/student-profile",
            json=payload,
            request_id=request_id,
        )
