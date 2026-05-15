from __future__ import annotations

from datetime import UTC, datetime, timedelta


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_in(**kwargs: int) -> datetime:
    return utc_now() + timedelta(**kwargs)
