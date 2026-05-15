from __future__ import annotations

from hashlib import sha256


def idempotency_key(*parts: str) -> str:
    return sha256(":".join(parts).encode("utf-8")).hexdigest()
