from __future__ import annotations

from shared_schemas import LessonPack


def validate_accessibility_text(pack: LessonPack) -> list[str]:
    warnings = []
    if not pack.student_access_pack.visual_description:
        warnings.append("Visual description is missing.")
    if not pack.student_access_pack.screen_reader_summary:
        warnings.append("Screen-reader summary is missing.")
    return warnings
