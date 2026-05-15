from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT),
    str(ROOT / "packages" / "shared_schemas"),
    str(ROOT / "packages" / "shared_events"),
    str(ROOT / "packages" / "shared_utils"),
    str(ROOT / "packages" / "service_auth"),
    str(ROOT / "packages" / "api_client"),
]

from apps.api_gateway.app.main import app


def main() -> None:
    output = Path("docs/openapi.json")
    output.write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
