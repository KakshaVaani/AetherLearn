from __future__ import annotations

from collections import defaultdict

from shared_utils.errors import RateLimitedError

_attempts: dict[str, int] = defaultdict(int)


def check_login_rate_limit(key: str, max_attempts: int = 10) -> None:
    _attempts[key] += 1
    if _attempts[key] > max_attempts:
        raise RateLimitedError("Too many login attempts")


def reset_login_rate_limit(key: str) -> None:
    _attempts.pop(key, None)
