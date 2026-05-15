from __future__ import annotations

from shared_schemas import LessonPack


def validate_lesson_pack(data: dict) -> LessonPack:
    return LessonPack.model_validate(data)
