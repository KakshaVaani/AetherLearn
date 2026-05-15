from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import Field

from .base import AetherBase, JsonDict, utc_now


class RuntimeMode(StrEnum):
    GEMINI = "gemini"
    OLLAMA = "ollama"
    LOCAL_HUB = "local-hub"
    MOCK = "mock"
    ON_DEVICE = "on-device"


class SchemaStatus(StrEnum):
    PASSED = "passed"
    REPAIRED = "repaired"
    FALLBACK = "fallback"
    FAILED = "failed"


class TraceWarning(AetherBase):
    code: str
    message: str
    severity: str = "warning"


class ToolCallTrace(AetherBase):
    name: str
    status: str
    latency_ms: int = 0
    details: JsonDict = Field(default_factory=dict)


class ImageTraceMetadata(AetherBase):
    mime_type: str | None = None
    bytes: int | None = None
    width: int | None = None
    height: int | None = None
    quality_warnings: list[str] = Field(default_factory=list)
    source_image_stored: bool = False


class GemmaTrace(AetherBase):
    runtime: RuntimeMode
    model: str
    local_only: bool
    hosted_api_used: bool
    latency_ms: int
    schema_status: SchemaStatus
    fallback_used: bool = False
    prompt_version: str = "lesson-pack-v1"
    tool_calls: list[ToolCallTrace] = Field(default_factory=list)
    image_metadata: ImageTraceMetadata = Field(default_factory=ImageTraceMetadata)
    warnings: list[TraceWarning] = Field(default_factory=list)
    confidence_notes: list[str] = Field(default_factory=list)
    unclear_source_areas: list[str] = Field(default_factory=list)
    teacher_review_required: bool = True
    generated_at: datetime = Field(default_factory=utc_now)


class RuntimeHealth(AetherBase):
    runtime: RuntimeMode
    ok: bool
    model: str
    local_only: bool
    hosted_api_used: bool
    warning: str | None = None
