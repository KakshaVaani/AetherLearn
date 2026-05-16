from __future__ import annotations

import json
from typing import Any

from .analyze_image_prompt import SYSTEM_PROMPT


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def source_pack_prompt(schema_hint: str, *, text: str, settings: dict[str, Any]) -> str:
    return f"""{SYSTEM_PROMPT}

Task: extract the Source Pack from the teacher notes.
Return JSON only with one top-level field: "sourceUnderstanding".

Fill these fields:
- title: 3-8 words.
- inferredTopic: one precise concept.
- observedText: 5-10 short facts, definitions, steps, examples, or equations from the notes.
- observedObjects: visual items only, such as diagrams, tables, images, or processes.
- unclearAreas: exact missing or ambiguous fragments; use [] when nothing is unclear.
- sourceLanguage: language used in the notes.

Generation settings:
{_json(settings)}

Teacher notes:
{text}

Output schema:
{schema_hint}
"""


def teacher_pack_prompt(
    schema_hint: str,
    *,
    source_understanding: dict[str, Any],
    text: str,
    settings: dict[str, Any],
) -> str:
    return f"""{SYSTEM_PROMPT}

Task: create the Teacher Pack from the Source Pack and teacher notes.
Return JSON only with one top-level field: "teacherPack".

Write for Grade {settings.get("gradeBand") or "unknown"} {settings.get("subject") or "General"}.
Priorities:
1. lessonObjective: one sentence starting with "Students will be able to..."
2. teacherExplanation: 2-4 clear paragraphs explaining the concept, key terms, and one classroom example.
3. boardPlan: exactly 4 ordered board steps.
4. worksheet: exactly 4 questions from easy to applied.
5. answerKey: exactly 4 matching answers in the same order.
6. differentiatedExplanations: exactly 3 plain-text items starting with "Support:", "Core:", and "Challenge:". No Markdown or math notation.
7. lowResourceActivity and homework: short, practical, classroom-ready.

Generation settings:
{_json(settings)}

Source Pack:
{_json(source_understanding)}

Teacher notes:
{text}

Output schema:
{schema_hint}
"""


def student_pack_prompt(
    schema_hint: str,
    *,
    source_understanding: dict[str, Any],
    text: str,
    settings: dict[str, Any],
) -> str:
    return f"""{SYSTEM_PROMPT}

Task: create the Student Access Pack from the Source Pack and teacher notes.
Return JSON only with one top-level field: "studentAccessPack".

Write for Grade {settings.get("gradeBand") or "unknown"} {settings.get("subject") or "General"}.
Priorities:
1. screenReaderSummary: detailed student notes with short headings, clear definitions, the main idea, and step-by-step explanation.
2. simpleExplanation: 2-3 short explanatory paragraphs. Use statements, not quiz questions or task prompts.
3. visualDescription: explain any diagram, table, image, or process in text; keep it brief when there is no visual.
4. vocabulary: exactly 5 important terms.
5. practiceQuestions: exactly 4 questions; hintsAnswers: exactly 4 matching hints or answers.
6. listenFirstAudioScript: 3-5 short spoken sentences using natural words, no Markdown, bullets, symbols, or equations.
7. revisionChecklist: 4 short review points.

Generation settings:
{_json(settings)}

Source Pack:
{_json(source_understanding)}

Teacher notes:
{text}

Output schema:
{schema_hint}
"""
