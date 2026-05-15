from __future__ import annotations

from io import BytesIO
from zipfile import BadZipFile, ZipFile

import orjson
from shared_schemas import KvPackManifest, KvPackValidationResult, LessonPack

from .manifest import content_hash_for


def validate_kvpack(content: bytes, max_mb: int = 25) -> KvPackValidationResult:
    if len(content) > max_mb * 1024 * 1024:
        return KvPackValidationResult(ok=False, errors=["Pack exceeds size limit"])
    try:
        with ZipFile(BytesIO(content)) as archive:
            names = set(archive.namelist())
            missing = {
                "manifest.json",
                "lessonPack.json",
                "traceSummary.json",
                "accessibility.json",
            } - names
            if missing:
                return KvPackValidationResult(
                    ok=False, errors=[f"Missing {name}" for name in sorted(missing)]
                )
            manifest = KvPackManifest.model_validate(orjson.loads(archive.read("manifest.json")))
            pack = LessonPack.model_validate(orjson.loads(archive.read("lessonPack.json")))
    except (BadZipFile, ValueError) as exc:
        return KvPackValidationResult(ok=False, errors=[f"Invalid kvpack: {exc}"])
    warnings = []
    if manifest.content_hash != content_hash_for(pack):
        warnings.append("Content hash mismatch; import will be marked unverified.")
    return KvPackValidationResult(ok=True, manifest=manifest, warnings=warnings, unverified=True)
