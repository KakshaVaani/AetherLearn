def normalize_query(value: str | None) -> str:
    return (value or "").strip().lower()
