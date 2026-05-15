from __future__ import annotations

import json
from typing import Any

from shared_utils.errors import AiSchemaInvalidError


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        stripped = stripped.removeprefix("json").strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start < 0 or end < start:
        raise AiSchemaInvalidError("Model response did not contain a JSON object")
    try:
        return json.loads(stripped[start : end + 1])
    except json.JSONDecodeError as exc:
        raise AiSchemaInvalidError("Model response JSON was invalid", {"error": str(exc)}) from exc
