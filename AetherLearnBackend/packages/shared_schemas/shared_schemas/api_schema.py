from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import Field

from .base import AetherBase, JsonDict, utc_now

T = TypeVar("T")


class ApiErrorBody(AetherBase):
    code: str
    message: str
    details: JsonDict = Field(default_factory=dict)


class ApiSuccess(AetherBase, Generic[T]):
    ok: bool = True
    data: T
    request_id: str


class ApiError(AetherBase):
    ok: bool = False
    error: ApiErrorBody
    request_id: str


class PaginatedResponse(AetherBase, Generic[T]):
    items: list[T]
    next_cursor: str | None = None
    total: int | None = None


class HealthResponse(AetherBase):
    ok: bool = True
    service: str
    version: str
    timestamp: datetime = Field(default_factory=utc_now)


class StatusResponse(AetherBase):
    service: str
    version: str
    env: str
    mongo_connected: bool | None = None
    redis_connected: bool | None = None
    nats_connected: bool | None = None
    object_storage_connected: bool | None = None
    runtime: JsonDict = Field(default_factory=dict)
    flags: JsonDict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
