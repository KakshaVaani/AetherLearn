from __future__ import annotations

import base64

from ..kvpack.importer import import_kvpack
from ..kvpack.validator import validate_kvpack


class ImportService:
    def __init__(self, max_mb: int) -> None:
        self.max_mb = max_mb

    async def validate(self, content_b64: str):
        return validate_kvpack(base64.b64decode(content_b64), max_mb=self.max_mb)

    async def import_pack(self, content_b64: str):
        result, pack = import_kvpack(base64.b64decode(content_b64), max_mb=self.max_mb)
        return {"result": result, "lessonPack": pack}
