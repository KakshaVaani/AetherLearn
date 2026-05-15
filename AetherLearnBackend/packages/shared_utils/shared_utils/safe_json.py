from __future__ import annotations

from typing import Any

import orjson


def dumps(value: Any) -> bytes:
    return orjson.dumps(value, option=orjson.OPT_SORT_KEYS)


def loads(data: str | bytes) -> Any:
    return orjson.loads(data)
