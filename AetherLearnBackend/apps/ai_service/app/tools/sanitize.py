from __future__ import annotations


def sanitize_output(text: str) -> str:
    return text.replace("\x00", "").strip()
