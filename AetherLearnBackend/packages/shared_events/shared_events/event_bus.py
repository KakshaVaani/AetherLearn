from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import nats
import orjson
from nats.aio.client import Client as NATS
from nats.js import JetStreamContext

from .event_envelope import EventEnvelope
from .subjects import DEAD_LETTER_SUBJECT, SUBJECTS, subject_for_event

EventHandler = Callable[[EventEnvelope], Awaitable[None]]


class EventBus:
    def __init__(self, nats_url: str, producer: str) -> None:
        self.nats_url = nats_url
        self.producer = producer
        self.nc: NATS | None = None
        self.js: JetStreamContext | None = None

    async def connect(self) -> None:
        self.nc = await nats.connect(self.nats_url)
        self.js = self.nc.jetstream()
        await self._ensure_streams()

    async def close(self) -> None:
        if self.nc:
            await self.nc.drain()

    async def _ensure_streams(self) -> None:
        if not self.js:
            return
        subjects = sorted(set(SUBJECTS.values()) | {DEAD_LETTER_SUBJECT})
        try:
            await self.js.add_stream(name="AETHERLEARN", subjects=subjects, storage="file")
        except Exception as exc:
            # Existing streams or NATS not supporting the management API should not
            # stop a service from starting; publish will surface connection issues.
            self.stream_setup_warning = str(exc)

    async def publish(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        actor: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        causation_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> EventEnvelope:
        if not self.js:
            await self.connect()
        envelope = EventEnvelope(
            event_type=event_type,
            producer=self.producer,
            payload=payload,
            actor=actor or {},
            correlation_id=correlation_id
            or EventEnvelope(event_type=event_type, producer=self.producer).correlation_id,
            causation_id=causation_id,
            idempotency_key=idempotency_key,
        )
        assert self.js is not None
        await self.js.publish(
            subject_for_event(event_type),
            orjson.dumps(envelope.model_dump(mode="json", by_alias=True)),
        )
        return envelope

    async def subscribe(self, event_type: str, durable: str, handler: EventHandler) -> None:
        if not self.js:
            await self.connect()
        assert self.js is not None
        subject = subject_for_event(event_type)

        async def _wrapped(msg):
            try:
                envelope = EventEnvelope.model_validate(orjson.loads(msg.data))
                await handler(envelope)
                await msg.ack()
            except Exception as exc:
                await msg.nak()
                await self.publish_dead_letter(msg.subject, msg.data, str(exc))

        await self.js.subscribe(subject, durable=durable, cb=_wrapped)

    async def publish_dead_letter(self, subject: str, data: bytes, error: str) -> None:
        if not self.js:
            return
        payload = {
            "subject": subject,
            "data": data.decode("utf-8", errors="replace"),
            "error": error,
        }
        await self.js.publish(DEAD_LETTER_SUBJECT, orjson.dumps(payload))
