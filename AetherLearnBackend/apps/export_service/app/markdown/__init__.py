from shared_schemas import LessonPack


def teacher_markdown(pack: LessonPack) -> str:
    return "\n".join(
        [
            f"# {pack.title}",
            "## Objective",
            pack.teacher_pack.lesson_objective,
            "## Explanation",
            pack.teacher_pack.teacher_explanation,
            "## Board Plan",
            *[f"- {item}" for item in pack.teacher_pack.board_plan],
            "## Homework",
            pack.teacher_pack.homework,
        ]
    )
