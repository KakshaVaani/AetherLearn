from __future__ import annotations


def homework_card_payload(lesson_id: str, code: str | None = None) -> dict:
    return {"lessonId": lesson_id, "code": code, "qrPayload": f"aetherlearn://lesson/{lesson_id}"}
