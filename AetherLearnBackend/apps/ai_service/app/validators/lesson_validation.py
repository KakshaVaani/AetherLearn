from __future__ import annotations

from typing import Any

from shared_schemas import LessonPack

VALID_STATUSES = {
    "draft",
    "generating",
    "generation_failed",
    "generated",
    "assigned",
    "pending_review",
    "published",
    "rejected",
    "archived",
}
VALID_VISIBILITIES = {"private", "class", "school", "commons"}


def validate_lesson_pack(data: dict) -> LessonPack:
    return LessonPack.model_validate(data)


def _first_text(data: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _to_snake(key: str) -> str:
    chars: list[str] = []
    for char in key:
        if char.isupper():
            chars.extend(["_", char.lower()])
        else:
            chars.append(char)
    return "".join(chars).lstrip("_")


def _ensure_dict(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key)
    snake_value = data.get(_to_snake(key))
    if not isinstance(value, dict) and isinstance(snake_value, dict):
        value = dict(snake_value)
        data[key] = value
    if not isinstance(value, dict):
        value = {}
        data[key] = value
    return value


def _ensure_list(data: dict[str, Any], key: str, default: list[str] | None = None) -> None:
    snake_key = _to_snake(key)
    if not isinstance(data.get(key), list) and isinstance(data.get(snake_key), list):
        data[key] = data[snake_key]
    if not isinstance(data.get(key), list):
        data[key] = list(default or [])


def _ensure_text(data: dict[str, Any], key: str, default: str) -> None:
    snake_key = _to_snake(key)
    if not isinstance(data.get(key), str) and isinstance(data.get(snake_key), str):
        data[key] = data[snake_key]
    if not isinstance(data.get(key), str) or not data[key].strip():
        data[key] = default


def _missing(data: dict[str, Any], *keys: str) -> bool:
    return not any(data.get(key) for key in keys)


def _unwrap_lesson_payload(data: dict[str, Any]) -> dict[str, Any]:
    for key in ("lessonPack", "lesson_pack", "pack", "lesson"):
        value = data.get(key)
        if isinstance(value, dict):
            return dict(value)
    return data


def _clean_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


def _clean_trace_warnings(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    warnings: list[dict[str, str]] = []
    for item in value:
        if isinstance(item, dict):
            warnings.append(
                {
                    "code": str(item.get("code") or "MODEL_WARNING"),
                    "message": str(item.get("message") or item),
                    "severity": str(item.get("severity") or "warning"),
                }
            )
        elif item is not None:
            warnings.append(
                {
                    "code": "MODEL_WARNING",
                    "message": str(item),
                    "severity": "warning",
                }
            )
    return warnings


def _repair_nested_metadata(payload: dict[str, Any]) -> None:
    if payload.get("status") not in VALID_STATUSES:
        payload["status"] = "generated"
    if payload.get("visibility") not in VALID_VISIBILITIES:
        payload["visibility"] = "private"
    if not isinstance(payload.get("version"), int):
        payload["version"] = 1
    _ensure_list(payload, "tags")
    if not isinstance(payload.get("sourceImageMetadata"), dict):
        payload["sourceImageMetadata"] = {}
    if not isinstance(payload.get("accessibility"), dict):
        payload["accessibility"] = {}
    if not isinstance(payload.get("sharing"), dict):
        payload["sharing"] = {}


def apply_generation_context(
    data: dict,
    *,
    teacher_id: str,
    lesson_id: str | None,
    settings: dict[str, Any] | None = None,
    runtime: str = "ollama",
    model: str = "unknown",
    raw_model_response: str | None = None,
) -> dict:
    payload = _unwrap_lesson_payload(dict(data))
    settings = settings or {}
    source_text = str(settings.get("text") or "").strip()
    model_text = str(raw_model_response or "").strip()
    source_lines = [line.strip() for line in source_text.splitlines() if line.strip()]
    model_lines = [line.strip() for line in model_text.splitlines() if line.strip()]
    observed_lines = source_lines or model_lines

    if lesson_id:
        payload["id"] = lesson_id
    if not payload.get("createdBy") and not payload.get("created_by"):
        payload["createdBy"] = teacher_id
    if not payload.get("createdByRole") and not payload.get("created_by_role"):
        payload["createdByRole"] = "teacher"

    source_understanding = _ensure_dict(payload, "sourceUnderstanding")
    title = (
        _first_text(payload, "title")
        or _first_text(source_understanding, "title")
        or _first_text(settings, "title")
        or (observed_lines[0][:80] if observed_lines else None)
        or "Generated lesson"
    )
    payload["title"] = title
    _ensure_text(payload, "schemaVersion", "lesson-pack-v1")
    _ensure_text(payload, "language", str(settings.get("language") or "en"))
    _ensure_text(payload, "subject", str(settings.get("subject") or "General"))
    _ensure_text(payload, "gradeBand", str(settings.get("gradeBand") or "unknown"))
    _ensure_text(
        payload,
        "searchText",
        f"{title} {payload['subject']} {payload['gradeBand']}",
    )
    _repair_nested_metadata(payload)

    _ensure_text(source_understanding, "title", title)
    if _missing(source_understanding, "observedText", "observed_text"):
        source_understanding["observedText"] = observed_lines[:6] or [title]
    _ensure_list(source_understanding, "observedObjects")
    _ensure_text(source_understanding, "inferredTopic", title)
    _ensure_list(
        source_understanding,
        "unclearAreas",
        ["Gemma returned a partial lesson pack; teacher review is required."],
    )
    _ensure_text(source_understanding, "sourceLanguage", payload["language"])

    teacher_pack = _ensure_dict(payload, "teacherPack")
    _ensure_text(
        teacher_pack,
        "lessonObjective",
        f"Students will explain {title} in their own words.",
    )
    _ensure_text(
        teacher_pack,
        "teacherExplanation",
        _first_text(teacher_pack, "teacher_explanation")
        or _first_text(source_understanding, "inferredTopic", "inferred_topic")
        or f"Use the source notes to introduce {title}, then check understanding with examples.",
    )
    _ensure_list(teacher_pack, "boardPlan")
    _ensure_text(
        teacher_pack,
        "lowResourceActivity",
        "Ask students to discuss the main idea in pairs, then share one example with the class.",
    )
    _ensure_list(teacher_pack, "worksheet", [f"Explain {title} in your own words."])
    _ensure_list(teacher_pack, "quiz")
    _ensure_list(teacher_pack, "answerKey")
    _ensure_list(teacher_pack, "assessmentQuestions")
    _ensure_text(
        teacher_pack,
        "homework", "Review the lesson notes and answer the practice questions."
    )
    _ensure_list(teacher_pack, "differentiatedExplanations")
    _ensure_list(
        teacher_pack,
        "teacherReviewChecklist",
        [
            "Check the generated lesson for accuracy.",
            "Confirm grade appropriateness before assigning.",
        ],
    )

    student_pack = _ensure_dict(payload, "studentAccessPack")
    summary = (
        _first_text(student_pack, "screenReaderSummary", "screen_reader_summary")
        or _first_text(student_pack, "simpleExplanation", "simple_explanation")
        or _first_text(teacher_pack, "teacherExplanation", "teacher_explanation")
        or f"This lesson explains {title}."
    )
    _ensure_text(
        student_pack,
        "listenFirstAudioScript",
        _first_text(student_pack, "listen_first_audio_script")
        or f"Today we are learning about {title}. Listen for the main idea and key words.",
    )
    _ensure_text(student_pack, "screenReaderSummary", summary)
    _ensure_text(
        student_pack,
        "visualDescription",
        _first_text(student_pack, "visual_description")
        or "The teacher source has been converted into accessible text notes.",
    )
    _ensure_text(student_pack, "simpleExplanation", summary)
    _ensure_list(student_pack, "vocabulary")
    _ensure_list(student_pack, "practiceQuestions", [f"What is the main idea of {title}?"])
    _ensure_list(student_pack, "hintsAnswers")
    _ensure_list(student_pack, "revisionChecklist")
    _ensure_list(student_pack, "independenceTips")
    _ensure_text(student_pack, "qnaContext", summary)

    confidence_notes = _ensure_dict(payload, "confidenceNotes")
    if not isinstance(confidence_notes.get("overallConfidence"), int | float):
        confidence_notes["overallConfidence"] = 0.65
    _ensure_list(
        confidence_notes,
        "notes",
        ["Gemma returned a partial lesson pack; required schema fields were repaired."],
    )
    _ensure_list(
        confidence_notes,
        "teacherReviewWarnings",
        ["Review this generated lesson before assigning it to students."],
    )

    trace = _ensure_dict(payload, "trace")
    trace["runtime"] = runtime
    trace["model"] = model
    trace["localOnly"] = runtime in {"ollama", "local-hub", "mock", "on-device"}
    trace["hostedApiUsed"] = runtime == "gemini"
    if not isinstance(trace.get("latencyMs"), int):
        trace["latencyMs"] = 0
    trace["schemaStatus"] = "repaired"
    if not isinstance(trace.get("fallbackUsed"), bool):
        trace["fallbackUsed"] = False
    trace["toolCalls"] = []
    if not isinstance(trace.get("imageMetadata"), dict):
        trace["imageMetadata"] = {}
    trace["confidenceNotes"] = _clean_string_list(trace.get("confidenceNotes"))
    trace["unclearSourceAreas"] = _clean_string_list(trace.get("unclearSourceAreas"))
    warnings = _clean_trace_warnings(trace.get("warnings"))
    trace["warnings"] = warnings
    if not warnings:
        warnings.append(
            {
                "code": "SCHEMA_REPAIRED",
                "message": "Gemma returned a partial lesson pack; missing required fields were filled.",
                "severity": "warning",
            }
        )
    if model_text and not data:
        warnings.append(
            {
                "code": "MODEL_JSON_REPAIRED",
                "message": "Gemma returned non-object JSON/text; the response was converted into a lesson draft.",
                "severity": "warning",
            }
        )

    return payload
