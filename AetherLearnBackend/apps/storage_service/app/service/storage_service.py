from __future__ import annotations

import base64
import binascii
import hashlib
import re
from uuid import uuid4

from shared_utils.errors import ValidationAppError

PURPOSE_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$")


class StorageService:
    def __init__(self, driver, metadata) -> None:
        self.driver = driver
        self.metadata = metadata

    async def upload(
        self, *, owner_id: str, content_b64: str, mime_type: str, purpose: str
    ) -> dict:
        if not PURPOSE_PATTERN.fullmatch(purpose):
            raise ValidationAppError("Invalid storage purpose")
        if not mime_type or "/" not in mime_type:
            raise ValidationAppError("Invalid MIME type")
        try:
            content = base64.b64decode(content_b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValidationAppError("Invalid base64 content") from exc
        if not content:
            raise ValidationAppError("Object content is empty")
        key = f"{purpose}/{uuid4()}"
        await self.driver.put(key, content, mime_type)
        return await self.metadata.create(
            {
                "ownerId": owner_id,
                "objectKey": key,
                "purpose": purpose,
                "mimeType": mime_type,
                "bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        )

    async def download(self, key: str) -> dict:
        return {
            "objectKey": key,
            "contentBase64": base64.b64encode(await self.driver.get(key)).decode("ascii"),
        }
