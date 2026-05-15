from __future__ import annotations

import base64
import json

from pydantic import Field
from shared_schemas.base import AetherBase


class UserContext(AetherBase):
    user_id: str
    role: str
    school_ids: list[str] = Field(default_factory=list)
    active_school_id: str | None = None
    token_version: int = 1


def encode_user_context(context: UserContext | dict) -> str:
    payload = context.model_dump(by_alias=True) if isinstance(context, UserContext) else context
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(data).decode("ascii")


def decode_user_context(value: str) -> UserContext:
    data = base64.urlsafe_b64decode(value.encode("ascii"))
    payload = json.loads(data)
    return UserContext.model_validate(payload)
