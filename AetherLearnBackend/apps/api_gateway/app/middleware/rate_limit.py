from __future__ import annotations

from collections import defaultdict

from shared_utils.errors import RateLimitedError

_counts: dict[str, int] = defaultdict(int)


def rate_limit(key: str, limit: int = 120) -> None:
    _counts[key] += 1
    if _counts[key] > limit:
        raise RateLimitedError("Rate limit exceeded")
