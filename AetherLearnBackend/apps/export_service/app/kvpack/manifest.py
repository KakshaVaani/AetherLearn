from __future__ import annotations

import hashlib

import orjson
from shared_schemas import KvPackManifest, LessonPack


def content_hash_for(pack: LessonPack) -> str:
    return hashlib.sha256(
        orjson.dumps(pack.model_dump(mode="json", by_alias=True), option=orjson.OPT_SORT_KEYS)
    ).hexdigest()


def manifest_for(pack: LessonPack, exported_by: str) -> KvPackManifest:
    return KvPackManifest(
        lesson_id=pack.id,
        lesson_version=pack.version,
        title=pack.title,
        subject=pack.subject,
        grade_band=pack.grade_band,
        language=pack.language,
        exported_by=exported_by,
        visibility=pack.visibility,
        content_hash=content_hash_for(pack),
        includes_source_image=False,
    )
