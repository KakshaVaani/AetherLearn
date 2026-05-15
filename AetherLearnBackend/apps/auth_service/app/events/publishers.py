from __future__ import annotations

from shared_events import EventBus


async def publish_user_created(bus: EventBus, user_id: str, role: str, email: str) -> None:
    await bus.publish("UserCreated", {"userId": user_id, "role": role, "email": email})
