from __future__ import annotations

import re

from shared_schemas import (
    AssignmentQuestion,
    GenerateAssignmentDraftInput,
    GenerateAssignmentDraftOutput,
    LessonPack,
)

GENERIC_MCQ_OPTIONS = {
    "answer from the lesson notes",
    "a detail not stated in the lesson",
    "a guess outside the lesson source",
    "i need to review again",
    "the lesson-supported answer",
    "an unrelated idea not supported by the lesson",
}


def needs_mcq_option_repair(draft: GenerateAssignmentDraftOutput) -> bool:
    if draft.answer_mode != "mcq":
        return False
    return any(_options_need_repair(question.options) for question in draft.questions)


def mcq_option_repair_prompt(
    input: GenerateAssignmentDraftInput,
    draft: GenerateAssignmentDraftOutput,
) -> str:
    return (
        "Repair this assignment draft so it is a true multiple-choice assignment.\n"
        "Use only the supplied lesson pack. Do not invent facts outside the lesson.\n"
        "Keep the existing title, instructions, question ids, and question prompts unless a prompt "
        "is not answerable from the lesson.\n"
        "For every question, return exactly four specific answer options. One option must be the "
        "best lesson-supported answer, and the other three must be plausible but incorrect.\n"
        "Do not use generic options like 'Answer from the lesson notes', 'A detail not stated in "
        "the lesson', 'A guess outside the lesson source', or 'I need to review again'.\n\n"
        "Return JSON only with fields:\n"
        "{"
        '"title": string, '
        '"instructions": string, '
        '"answer_mode": "mcq", '
        '"versions": string[], '
        '"questions": [{"id": string, "prompt": string, "hint": string|null, "options": string[]}]'
        "}\n\n"
        f"Draft to repair: {draft.model_dump(mode='json', by_alias=True)}\n"
        f"Lesson pack: {input.lesson_pack.model_dump(mode='json', by_alias=True)}"
    )


def repair_assignment_draft(
    input: GenerateAssignmentDraftInput,
    draft: GenerateAssignmentDraftOutput,
) -> GenerateAssignmentDraftOutput:
    if input.question_type != "mcq":
        return draft.model_copy(update={"answer_mode": input.question_type})

    questions = [
        question
        if not _options_need_repair(question.options)
        else question.model_copy(
            update={"options": lesson_aware_mcq_options(input.lesson_pack, question, index)}
        )
        for index, question in enumerate(draft.questions)
    ]
    return draft.model_copy(update={"answer_mode": "mcq", "questions": questions})


def lesson_aware_mcq_options(
    lesson: LessonPack,
    question: AssignmentQuestion | str,
    index: int,
) -> list[str]:
    prompt = question.prompt if isinstance(question, AssignmentQuestion) else question
    correct = _best_answer_candidate(lesson, prompt, index)
    distractors = _distractor_candidates(lesson, prompt, correct)
    options = _dedupe_options([correct, *distractors])
    while len(options) < 4:
        options.append(_fallback_distractor(lesson, len(options)))
    return options[:4]


def _options_need_repair(options: list[str]) -> bool:
    cleaned = [_normalize(option) for option in options if option.strip()]
    return len(cleaned) < 4 or any(option in GENERIC_MCQ_OPTIONS for option in cleaned)


def _best_answer_candidate(lesson: LessonPack, prompt: str, index: int) -> str:
    indexed_answers = [
        *lesson.teacher_pack.answer_key,
        *lesson.student_access_pack.hints_answers,
    ]
    if index < len(indexed_answers):
        answer = _clean_option(indexed_answers[index])
        if answer:
            return answer

    sentences = _lesson_sentences(lesson)
    prompt_terms = _terms(prompt)
    ranked = sorted(
        sentences,
        key=lambda sentence: len(prompt_terms.intersection(_terms(sentence))),
        reverse=True,
    )
    for sentence in ranked:
        option = _clean_option(sentence)
        if option:
            return option

    topic = lesson.source_understanding.inferred_topic or lesson.title
    return _clean_option(f"{topic} is explained using details from the lesson.")


def _distractor_candidates(lesson: LessonPack, prompt: str, correct: str) -> list[str]:
    topic = lesson.source_understanding.inferred_topic or lesson.title
    candidates: list[str] = []
    for item in [
        *lesson.student_access_pack.vocabulary,
        *lesson.teacher_pack.board_plan,
        *lesson.teacher_pack.quiz,
        *lesson.teacher_pack.worksheet,
        *lesson.student_access_pack.practice_questions,
    ]:
        option = _clean_option(item)
        if option and _normalize(option) != _normalize(correct):
            candidates.append(option)

    prompt_terms = _terms(prompt)
    ranked = sorted(
        candidates,
        key=lambda option: len(prompt_terms.intersection(_terms(option))),
    )
    fallback = [
        f"It is mainly about a different part of {topic}.",
        f"It ignores the lesson explanation of {topic}.",
        "It uses a detail that is not the best answer for this question.",
    ]
    return [*ranked, *fallback]


def _fallback_distractor(lesson: LessonPack, index: int) -> str:
    topic = lesson.source_understanding.inferred_topic or lesson.title
    fallbacks = [
        f"It focuses on an unrelated idea instead of {topic}.",
        f"It leaves out the key lesson detail about {topic}.",
        "It answers a different question from the lesson.",
        "It changes the lesson explanation into an unsupported claim.",
    ]
    return fallbacks[index % len(fallbacks)]


def _lesson_sentences(lesson: LessonPack) -> list[str]:
    text_blocks = [
        lesson.student_access_pack.simple_explanation,
        lesson.student_access_pack.screen_reader_summary,
        lesson.student_access_pack.visual_description,
        lesson.teacher_pack.teacher_explanation,
        *lesson.source_understanding.observed_text,
        *lesson.teacher_pack.answer_key,
        *lesson.student_access_pack.hints_answers,
    ]
    sentences: list[str] = []
    for block in text_blocks:
        sentences.extend(part.strip() for part in re.split(r"(?<=[.!?])\s+", block) if part.strip())
    return sentences


def _dedupe_options(options: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for option in options:
        cleaned = _clean_option(option)
        normalized = _normalize(cleaned)
        if not cleaned or normalized in seen or normalized in GENERIC_MCQ_OPTIONS:
            continue
        seen.add(normalized)
        result.append(cleaned)
    return result


def _clean_option(value: str) -> str:
    cleaned = re.sub(r"^(answer|hint|option)\s*:\s*", "", value.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^\d+[\).:-]\s*", "", cleaned)
    cleaned = " ".join(cleaned.split())
    if len(cleaned) > 130:
        cleaned = cleaned[:127].rstrip() + "..."
    return cleaned


def _terms(value: str) -> set[str]:
    stop_words = {
        "about",
        "according",
        "answer",
        "does",
        "from",
        "into",
        "kind",
        "lesson",
        "major",
        "must",
        "question",
        "source",
        "that",
        "the",
        "this",
        "what",
        "when",
        "where",
        "which",
        "with",
    }
    return {
        term
        for term in re.findall(r"[a-zA-Z][a-zA-Z0-9]+", value.lower())
        if term not in stop_words and len(term) > 2
    }


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().split())
