from __future__ import annotations

from pydantic import Field

from .base import AetherBase, Timestamped
from .lesson_pack_schema import LessonPack


class CommonsLesson(Timestamped):
    id: str
    lesson_id: str
    title: str
    subject: str
    grade_band: str
    language: str
    tags: list[str] = Field(default_factory=list)
    pack: LessonPack | None = None
    published_by: str
    verified_educator: bool = False
    offline_downloadable: bool = True


class CommonsSearchRequest(AetherBase):
    q: str | None = None
    subject: str | None = None
    grade: str | None = None
    language: str | None = None
    audio_first: bool | None = None
    screen_reader_ready: bool | None = None
    simple_language: bool | None = None
    local_language: bool | None = None
    verified_educator: bool | None = None
    topic: str | None = None
    board: str | None = None
    offline_downloadable: bool | None = None
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = None


class CommonsSearchResponse(AetherBase):
    items: list[CommonsLesson]
    next_cursor: str | None = None


class CommonsCollection(Timestamped):
    id: str
    title: str
    description: str
    lesson_ids: list[str] = Field(default_factory=list)
    created_by: str


class CommonsReport(Timestamped):
    id: str
    lesson_id: str
    reported_by: str
    reason: str
    status: str = "open"


class ForkLessonRequest(AetherBase):
    lesson_id: str
    target_classroom_id: str | None = None
