from __future__ import annotations

from datetime import datetime

from pydantic import Field

from .base import AetherBase, utc_now


class KvPackManifest(AetherBase):
    format_version: str = "kvpack-1"
    app_name: str = "AetherLearn"
    app_version: str = "1.0.0"
    schema_version: str = "lesson-pack-v1"
    lesson_id: str
    lesson_version: int = 1
    title: str
    subject: str
    grade_band: str
    language: str
    exported_at: datetime = Field(default_factory=utc_now)
    exported_by: str
    visibility: str = "private"
    content_hash: str
    includes_source_image: bool = False
    safety_note: str = "Teacher review is required before classroom use."


class KvPackValidationResult(AetherBase):
    ok: bool
    manifest: KvPackManifest | None = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unverified: bool = False


class KvPackImportResult(AetherBase):
    ok: bool
    lesson_id: str | None = None
    imported_as_unverified: bool = True
    validation: KvPackValidationResult
