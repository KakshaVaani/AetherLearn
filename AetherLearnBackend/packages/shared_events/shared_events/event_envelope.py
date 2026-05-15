from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from pydantic import Field, field_validator
from shared_schemas.base import AetherBase, JsonDict, utc_now

from .subjects import SUBJECTS


class EventActor(AetherBase):
    user_id: str | None = None
    role: str | None = None


class RetryMetadata(AetherBase):
    attempt: int = 0
    max_attempts: int = 5
    last_error: str | None = None


class EventEnvelope(AetherBase):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    version: int = 1
    timestamp: datetime = Field(default_factory=utc_now)
    producer: str
    correlation_id: str = Field(default_factory=lambda: str(uuid4()))
    causation_id: str | None = None
    actor: EventActor = Field(default_factory=EventActor)
    payload: JsonDict = Field(default_factory=dict)
    idempotency_key: str | None = None
    retry: RetryMetadata = Field(default_factory=RetryMetadata)

    @field_validator("event_type")
    @classmethod
    def known_event(cls, value: str) -> str:
        if value not in SUBJECTS:
            raise ValueError(f"Unknown event type: {value}")
        return value
