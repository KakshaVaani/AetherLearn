from __future__ import annotations

import base64
from uuid import uuid4


class StorageService:
    def __init__(self, driver, metadata) -> None:
        self.driver = driver
        self.metadata = metadata

    async def upload(
        self, *, owner_id: str, content_b64: str, mime_type: str, purpose: str
    ) -> dict:
        content = base64.b64decode(content_b64)
        key = f"{purpose}/{uuid4()}"
        await self.driver.put(key, content, mime_type)
        return await self.metadata.create(
            {
                "ownerId": owner_id,
                "objectKey": key,
                "purpose": purpose,
                "mimeType": mime_type,
                "bytes": len(content),
            }
        )

    async def download(self, key: str) -> dict:
        return {
            "objectKey": key,
            "contentBase64": base64.b64encode(await self.driver.get(key)).decode("ascii"),
        }
