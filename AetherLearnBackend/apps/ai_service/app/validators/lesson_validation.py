from __future__ import annotations

import re
from typing import Any

from shared_schemas import (
    ConfidenceNotes,
    GenerateSourcePackOutput,
    GenerateStudentPackOutput,
    GenerateTeacherPackOutput,
    LessonPack,
    SourceUnderstanding,
    StudentAccessPack,
    TeacherPack,
)

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
LEARNER_SUPPORT_LABELS = ("Support", "Core", "Challenge")


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


def _collect_list_text(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []
    if isinstance(value, bool | int | float):
        return [str(value)]
    if isinstance(value, list | tuple | set):
        result: list[str] = []
        for item in value:
            result.extend(_collect_list_text(item))
        return result
    if isinstance(value, dict):
        result: list[str] = []
        for preferred_key in ("text", "value", "title", "term", "definition", "prompt", "answer", "hint"):
            result.extend(_collect_list_text(value.get(preferred_key)))
        if result:
            return result
        for item in value.values():
            result.extend(_collect_list_text(item))
        return result
    stripped = str(value).strip()
    return [stripped] if stripped else []


def _ensure_list(data: dict[str, Any], key: str, default: list[str] | None = None) -> None:
    snake_key = _to_snake(key)
    value = data.get(key)
    if not _collect_list_text(value) and snake_key in data:
        value = data.get(snake_key)
    values = _collect_list_text(value)
    data[key] = values if values else list(default or [])


def _ensure_text(data: dict[str, Any], key: str, default: str) -> None:
    snake_key = _to_snake(key)
    if not isinstance(data.get(key), str) and isinstance(data.get(snake_key), str):
        data[key] = data[snake_key]
    if not isinstance(data.get(key), str) or not data[key].strip():
        data[key] = default


def _clean_plain_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = re.sub(r"\\text\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = text.replace("**", "").replace("$", "")
    text = re.sub(r"\\([A-Za-z]+)", r"\1", text)
    text = re.sub(r"_\{?([^}\s]+)\}?", r"\1", text)
    text = text.replace("{", "").replace("}", "")
    text = re.sub(r"(?<=\s)o(?=\s)", "to", text)
    return " ".join(text.split())


def _strip_support_label(value: str, label: str) -> str:
    text = _clean_plain_text(value)
    text = re.sub(r"^[\-•\d.)\s]+", "", text).strip()
    label_pattern = re.escape(label) if label else "|".join(LEARNER_SUPPORT_LABELS)
    pattern = rf"^(?:{label_pattern})\s*(?:\([^)]*\))?\s*:\s*"
    return re.sub(pattern, "", text, flags=re.IGNORECASE).strip()


def _split_learner_support_values(values: list[str]) -> dict[str, str]:
    combined = "\n".join(_clean_plain_text(value) for value in values if _clean_plain_text(value))
    found: dict[str, str] = {}
    if not combined:
        return found

    label_pattern = "|".join(LEARNER_SUPPORT_LABELS)
    matches = list(
        re.finditer(
            rf"(?i)(?:^|\n|\s)({label_pattern})\s*(?:\([^)]*\))?\s*:",
            combined,
        )
    )
    for index, match in enumerate(matches):
        label = match.group(1).title()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(combined)
        found[label] = _strip_support_label(combined[match.start() : end], label)
    return found


def _normalize_learner_support(data: dict[str, Any], topic: str) -> None:
    values = _collect_list_text(data.get("differentiatedExplanations"))
    found = _split_learner_support_values(values)
    unused_values = [_strip_support_label(value, "") for value in values]
    defaults = {
        "Support": f"Use simple words, read key terms aloud, and let students answer with a labelled example about {topic}.",
        "Core": f"Ask students to explain {topic} using the lesson vocabulary and one accurate example.",
        "Challenge": f"Ask students to connect {topic} to a new example and explain why the idea still applies.",
    }

    normalized: list[str] = []
    for index, label in enumerate(LEARNER_SUPPORT_LABELS):
        text = found.get(label)
        if not text and index < len(unused_values):
            text = unused_values[index]
        text = _clean_plain_text(text or defaults[label])
        normalized.append(f"{label}: {text}")
    data["differentiatedExplanations"] = normalized


def _looks_like_question_prompt_list(value: str) -> bool:
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    if not lines:
        return False
    prompt_verbs = (
        "define",
        "describe",
        "explain",
        "identify",
        "list",
        "name",
        "understand",
        "what",
        "why",
        "how",
        "which",
    )
    prompt_like = 0
    for line in lines:
        cleaned = line.lstrip("-•* ").strip()
        cleaned = cleaned.split(".", 1)[1].strip() if cleaned[:2].replace(".", "").isdigit() else cleaned
        lowered = cleaned.lower()
        if lowered.endswith("?") or lowered.startswith(prompt_verbs):
            prompt_like += 1
    return prompt_like >= 2 or (len(lines) == 1 and lines[0].strip().endswith("?"))


def _student_explanation_from_summary(summary: str, topic: str, grade: str) -> str:
    cleaned_summary = " ".join(summary.split()).strip()
    if cleaned_summary and not _looks_like_question_prompt_list(cleaned_summary):
        return cleaned_summary
    return (
        f"This Grade {grade} lesson explains {topic}. Start with the main idea, then connect "
        "each key term to one example from the lesson. Read the summary first, notice how the "
        "important parts fit together, and then use the practice questions to check your understanding."
    )


def _missing(data: dict[str, Any], *keys: str) -> bool:
    return not any(data.get(key) for key in keys)


def _unwrap_lesson_payload(data: dict[str, Any]) -> dict[str, Any]:
    for key in ("lessonPack", "lesson_pack", "pack", "lesson"):
        value = data.get(key)
        if isinstance(value, dict):
            return dict(value)
    return data


def _unwrap_pack_payload(data: dict[str, Any], *keys: str) -> dict[str, Any]:
    for key in keys:
        value = data.get(key)
        if isinstance(value, dict):
            return dict(value)
    return dict(data)


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
    schema_status: str = "repaired",
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
    _ensure_list(source_understanding, "observedText")
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
    _normalize_learner_support(teacher_pack, title)
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
    if _looks_like_question_prompt_list(student_pack["simpleExplanation"]):
        student_pack["simpleExplanation"] = _student_explanation_from_summary(
            student_pack["screenReaderSummary"], title, str(settings.get("gradeBand") or "unknown")
        )
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
    trace["schemaStatus"] = schema_status
    if not isinstance(trace.get("fallbackUsed"), bool):
        trace["fallbackUsed"] = False
    trace["toolCalls"] = []
    if not isinstance(trace.get("imageMetadata"), dict):
        trace["imageMetadata"] = {}
    trace["confidenceNotes"] = _clean_string_list(trace.get("confidenceNotes"))
    trace["unclearSourceAreas"] = _clean_string_list(trace.get("unclearSourceAreas"))
    warnings = _clean_trace_warnings(trace.get("warnings"))
    trace["warnings"] = warnings
    if not warnings and schema_status != "passed":
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


def repair_source_understanding(
    data: dict,
    *,
    settings: dict[str, Any] | None = None,
    raw_model_response: str | None = None,
) -> SourceUnderstanding:
    settings = settings or {}
    source_text = str(settings.get("text") or "").strip()
    model_text = str(raw_model_response or "").strip()
    source_lines = [line.strip() for line in source_text.splitlines() if line.strip()]
    model_lines = [line.strip() for line in model_text.splitlines() if line.strip()]
    observed_lines = source_lines or model_lines
    payload = _unwrap_pack_payload(dict(data), "sourceUnderstanding", "source_understanding")
    title = (
        _first_text(payload, "title")
        or _first_text(settings, "title")
        or (observed_lines[0][:80] if observed_lines else None)
        or "Generated lesson"
    )

    _ensure_text(payload, "title", title)
    if _missing(payload, "observedText", "observed_text"):
        payload["observedText"] = observed_lines[:8] or [title]
    _ensure_list(payload, "observedText")
    _ensure_list(payload, "observedObjects")
    _ensure_text(payload, "inferredTopic", title)
    _ensure_list(payload, "unclearAreas")
    _ensure_text(payload, "sourceLanguage", str(settings.get("language") or "en"))
    return GenerateSourcePackOutput.model_validate(
        {"sourceUnderstanding": payload}
    ).source_understanding


def repair_teacher_pack(
    data: dict,
    *,
    source_understanding: SourceUnderstanding,
    settings: dict[str, Any] | None = None,
) -> TeacherPack:
    settings = settings or {}
    payload = _unwrap_pack_payload(dict(data), "teacherPack", "teacher_pack")
    topic = source_understanding.inferred_topic or source_understanding.title
    grade = str(settings.get("gradeBand") or "unknown")
    subject = str(settings.get("subject") or "General")

    _ensure_text(
        payload,
        "lessonObjective",
        f"Students will explain {topic} using accurate {subject} vocabulary for Grade {grade}.",
    )
    _ensure_text(
        payload,
        "teacherExplanation",
        f"Introduce {topic}, connect it to a familiar example, and check understanding with questions.",
    )
    _ensure_list(
        payload,
        "boardPlan",
        [
            f"Write the topic: {topic}.",
            "List the key vocabulary.",
            "Work through one example step by step.",
            "Close with two review questions.",
        ],
    )
    _ensure_text(
        payload,
        "lowResourceActivity",
        "Students explain the idea to a partner, then share one example with the class.",
    )
    _ensure_list(payload, "worksheet", [f"Explain {topic} in your own words."])
    _ensure_list(payload, "quiz")
    _ensure_list(payload, "answerKey", ["Answers should match the teacher explanation."])
    _ensure_list(payload, "assessmentQuestions")
    _ensure_text(payload, "homework", "Review the lesson and answer the worksheet questions.")
    _ensure_list(
        payload,
        "differentiatedExplanations",
        [
            "Provide oral explanation before written work.",
            "Let students use the vocabulary list while answering.",
        ],
    )
    _normalize_learner_support(payload, topic)
    _ensure_list(
        payload,
        "teacherReviewChecklist",
        [
            "Confirm the explanation is accurate.",
            "Check grade appropriateness before assignment.",
        ],
    )
    return GenerateTeacherPackOutput.model_validate({"teacherPack": payload}).teacher_pack


def repair_student_access_pack(
    data: dict,
    *,
    source_understanding: SourceUnderstanding,
    settings: dict[str, Any] | None = None,
) -> StudentAccessPack:
    settings = settings or {}
    payload = _unwrap_pack_payload(dict(data), "studentAccessPack", "student_access_pack")
    topic = source_understanding.inferred_topic or source_understanding.title
    grade = str(settings.get("gradeBand") or "unknown")
    summary = f"This Grade {grade} lesson explains {topic} in simple steps."

    _ensure_text(
        payload,
        "listenFirstAudioScript",
        f"Today we are learning about {topic}. Listen for the main idea and key words.",
    )
    _ensure_text(payload, "screenReaderSummary", summary)
    _ensure_text(
        payload,
        "visualDescription",
        "Any visual ideas from the source are explained in text for accessibility.",
    )
    _ensure_text(payload, "simpleExplanation", summary)
    if _looks_like_question_prompt_list(payload["simpleExplanation"]):
        payload["simpleExplanation"] = _student_explanation_from_summary(
            payload["screenReaderSummary"], topic, grade
        )
    _ensure_list(payload, "vocabulary")
    _ensure_list(payload, "practiceQuestions", [f"What is the main idea of {topic}?"])
    _ensure_list(payload, "hintsAnswers")
    _ensure_list(payload, "revisionChecklist", ["Read the summary.", "Try one question."])
    _ensure_list(payload, "independenceTips", ["Use the vocabulary list while answering."])
    _ensure_text(payload, "qnaContext", summary)
    return GenerateStudentPackOutput.model_validate(
        {"studentAccessPack": payload}
    ).student_access_pack


def compose_lesson_pack_from_parts(
    *,
    source_understanding: SourceUnderstanding,
    teacher_pack: TeacherPack,
    student_access_pack: StudentAccessPack,
    teacher_id: str,
    lesson_id: str | None,
    settings: dict[str, Any],
    runtime: str,
    model: str,
    latency_ms: int,
    warnings: list[dict[str, str]] | None = None,
) -> LessonPack:
    title = str(settings.get("title") or source_understanding.title)
    data = {
        "id": lesson_id,
        "title": title,
        "sourceUnderstanding": source_understanding.model_dump(mode="json", by_alias=True),
        "teacherPack": teacher_pack.model_dump(mode="json", by_alias=True),
        "studentAccessPack": student_access_pack.model_dump(mode="json", by_alias=True),
        "confidenceNotes": ConfidenceNotes(
            overall_confidence=0.78,
            notes=["Generated with focused source, teacher, and student pack calls."],
            teacher_review_warnings=["Teacher review is required before assigning."],
        ).model_dump(mode="json", by_alias=True),
        "trace": {
            "runtime": runtime,
            "model": model,
            "localOnly": runtime in {"ollama", "local-hub", "mock", "on-device"},
            "hostedApiUsed": runtime == "gemini",
            "latencyMs": latency_ms,
            "schemaStatus": "passed",
            "fallbackUsed": False,
            "warnings": warnings or [],
            "confidenceNotes": ["Focused multi-call lesson generation completed."],
            "unclearSourceAreas": source_understanding.unclear_areas,
            "teacherReviewRequired": True,
        },
        "status": "generated",
        "visibility": "private",
        "createdBy": teacher_id,
        "createdByRole": "teacher",
        "schoolId": settings.get("schoolId"),
        "classroomId": settings.get("classroomId"),
        "classSubjectId": settings.get("classSubjectId"),
        "language": settings.get("language") or source_understanding.source_language,
        "subject": settings.get("subject") or "General",
        "gradeBand": settings.get("gradeBand") or "unknown",
        "tags": [str(settings.get("subject") or "general").lower()],
        "searchText": f"{title} {settings.get('subject') or 'General'} {settings.get('gradeBand') or 'unknown'}",
    }
    return validate_lesson_pack(
        apply_generation_context(
            data,
            teacher_id=teacher_id,
            lesson_id=lesson_id,
            settings=settings,
            runtime=runtime,
            model=model,
            schema_status="passed",
        )
    )
