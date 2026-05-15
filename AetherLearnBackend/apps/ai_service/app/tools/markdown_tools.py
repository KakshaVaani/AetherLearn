from __future__ import annotations

from shared_schemas import LessonPack


def build_worksheet_markdown(pack: LessonPack) -> str:
    lines = [
        f"# {pack.title}",
        "## Worksheet",
        *[f"- {item}" for item in pack.teacher_pack.worksheet],
    ]
    return "\n".join(lines)
