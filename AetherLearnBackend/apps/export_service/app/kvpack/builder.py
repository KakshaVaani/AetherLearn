from __future__ import annotations

from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import orjson
from shared_schemas import LessonPack

from .manifest import manifest_for


def build_kvpack(pack: LessonPack, exported_by: str) -> tuple[bytes, dict]:
    manifest = manifest_for(pack, exported_by)
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr(
            "manifest.json", orjson.dumps(manifest.model_dump(mode="json", by_alias=True))
        )
        archive.writestr(
            "lessonPack.json", orjson.dumps(pack.model_dump(mode="json", by_alias=True))
        )
        archive.writestr(
            "traceSummary.json", orjson.dumps(pack.trace.model_dump(mode="json", by_alias=True))
        )
        archive.writestr(
            "accessibility.json",
            orjson.dumps(pack.accessibility.model_dump(mode="json", by_alias=True)),
        )
    return output.getvalue(), manifest.model_dump(mode="json", by_alias=True)
