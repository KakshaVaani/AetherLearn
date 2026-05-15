def clean_filters(filters: dict) -> dict:
    return {key: value for key, value in filters.items() if value not in (None, "")}
