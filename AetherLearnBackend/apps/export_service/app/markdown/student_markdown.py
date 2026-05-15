from shared_schemas import LessonPack


def student_markdown(pack: LessonPack) -> str:
    return "\n".join(
        [
            f"# {pack.title}",
            "## Listen First",
            pack.student_access_pack.listen_first_audio_script,
            "## Summary",
            pack.student_access_pack.screen_reader_summary,
            "## Practice",
            *[f"- {item}" for item in pack.student_access_pack.practice_questions],
        ]
    )
