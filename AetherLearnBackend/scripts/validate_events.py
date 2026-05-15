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

from shared_events import SUBJECTS, validate_subject


def main() -> None:
    invalid = [subject for subject in SUBJECTS.values() if not validate_subject(subject)]
    if invalid:
        raise SystemExit(f"Invalid subjects: {invalid}")
    print(f"Validated {len(SUBJECTS)} event subjects")


if __name__ == "__main__":
    main()
