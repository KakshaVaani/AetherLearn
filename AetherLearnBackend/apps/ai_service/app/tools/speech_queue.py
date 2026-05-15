from __future__ import annotations


def estimate_listening_time(text: str, words_per_minute: int = 140) -> int:
    words = len(text.split())
    return max(1, round(words / words_per_minute))


def create_speech_queue(script: str) -> list[dict[str, str]]:
    return [
        {"type": "speech", "text": paragraph.strip()}
        for paragraph in script.split("\n")
        if paragraph.strip()
    ]
