from datetime import UTC, datetime, timedelta


def signed_url_metadata(object_key: str, minutes: int = 15) -> dict:
    return {
        "objectKey": object_key,
        "expiresAt": (datetime.now(UTC) + timedelta(minutes=minutes)).isoformat(),
    }
