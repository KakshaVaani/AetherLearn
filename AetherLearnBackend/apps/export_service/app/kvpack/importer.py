from __future__ import annotations

from io import BytesIO
from zipfile import ZipFile

import orjson
from shared_schemas import KvPackImportResult, LessonPack

from .validator import validate_kvpack


def import_kvpack(content: bytes, max_mb: int = 25) -> tuple[KvPackImportResult, LessonPack | None]:
    validation = validate_kvpack(content, max_mb=max_mb)
    if not validation.ok:
        return KvPackImportResult(ok=False, validation=validation), None
    with ZipFile(BytesIO(content)) as archive:
        pack = LessonPack.model_validate(orjson.loads(archive.read("lessonPack.json")))
    pack.sharing.verified_educator = False
    pack.tags = sorted(set(pack.tags + ["imported", "unverified"]))
    return KvPackImportResult(
        ok=True, lesson_id=pack.id, imported_as_unverified=True, validation=validation
    ), pack
