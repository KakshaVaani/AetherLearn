from __future__ import annotations

from shared_schemas import LessonPack, SchemaStatus, TraceWarning


def mark_repaired(pack: LessonPack, warning: str) -> LessonPack:
    pack.trace.schema_status = SchemaStatus.REPAIRED
    pack.trace.warnings.append(TraceWarning(code="SCHEMA_REPAIRED", message=warning))
    return pack
