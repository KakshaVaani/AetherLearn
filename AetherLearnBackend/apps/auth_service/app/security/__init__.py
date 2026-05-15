from __future__ import annotations

from shared_schemas import SafeUser


def to_safe_user(document: dict) -> SafeUser:
    data = dict(document)
    data.pop("passwordHash", None)
    data.pop("password_hash", None)
    data.pop("emailNormalized", None)
    data.pop("email_normalized", None)
    return SafeUser.model_validate(data)
