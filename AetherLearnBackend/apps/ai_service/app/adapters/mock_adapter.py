from __future__ import annotations

from time import perf_counter

from shared_schemas import (
    AnalyzeImageInput,
    AskAnswer,
    AskInput,
    ConfidenceNotes,
    GemmaTrace,
    GenerateFromTextInput,
    ImageTraceMetadata,
    ImproveLessonInput,
    LessonAccessibilityMetadata,
    LessonPack,
    RuntimeHealth,
    RuntimeMode,
    SchemaStatus,
    SourceUnderstanding,
    StudentAccessPack,
    TeacherPack,
    TraceWarning,
    TranslateLessonInput,
)
from shared_utils.object_id import new_id

from .base import BaseAIAdapter


class MockAdapter(BaseAIAdapter):
    name = "mock"
    model = "mock-deterministic-aetherlearn"

    async def health(self) -> RuntimeHealth:
        return RuntimeHealth(
            runtime=RuntimeMode.MOCK,
            ok=True,
            model=self.model,
            local_only=True,
            hosted_api_used=False,
        )

    async def analyze_image(self, input: AnalyzeImageInput) -> LessonPack:
        return self._pack(
            teacher_id=input.teacher_id,
            lesson_id=input.lesson_id,
            title=str(input.settings.get("title") or "Photosynthesis"),
            subject=str(input.settings.get("subject") or "Science"),
            grade_band=str(input.settings.get("gradeBand") or "Class 7"),
            language=str(input.settings.get("language") or "en"),
            source="image",
        )

    async def generate_from_text(self, input: GenerateFromTextInput) -> LessonPack:
        title = input.text.splitlines()[0][:80] if input.text.strip() else "Classroom text lesson"
        return self._pack(
            teacher_id=input.teacher_id,
            lesson_id=input.lesson_id,
            title=title,
            subject=str(input.settings.get("subject") or "General"),
            grade_band=str(input.settings.get("gradeBand") or "mixed"),
            language=str(input.settings.get("language") or "en"),
            source="text",
        )

    async def ask(self, input: AskInput) -> AskAnswer:
        lesson = input.lesson_pack
        topic = lesson.source_understanding.inferred_topic or lesson.title
        if "notes" in input.question.lower():
            vocabulary = ", ".join(lesson.student_access_pack.vocabulary[:6])
            practice = "\n".join(f"- {item}" for item in lesson.student_access_pack.practice_questions[:4])
            return AskAnswer(
                answer=(
                    f"# {lesson.title}\n\n"
                    f"## 1. Big Idea\n{lesson.student_access_pack.simple_explanation}\n\n"
                    f"## 2. What To Remember\n"
                    f"- Topic: {topic}\n"
                    f"- Subject: {lesson.subject}\n"
                    f"- Key words: {vocabulary or 'review the lesson vocabulary'}\n\n"
                    f"## 3. Step-by-Step Notes\n{lesson.student_access_pack.screen_reader_summary}\n\n"
                    f"## 4. Practice\n{practice or '- Try one teacher-provided practice question.'}\n\n"
                    "## 5. Quick Revision\n"
                    "- Read the big idea once.\n"
                    "- Say one key word aloud.\n"
                    "- Try one question without looking at the notes."
                ),
                simple_answer=lesson.student_access_pack.simple_explanation,
                confidence=0.8,
                follow_up_suggestion="Download these notes as a PDF and review the practice section.",
                source_limited=True,
            )
        return AskAnswer(
            answer=(
                f"Using only this lesson, {input.lesson_pack.title} is about "
                f"{input.lesson_pack.source_understanding.inferred_topic}. "
                "Review the vocabulary and try the first practice question."
            ),
            simple_answer=(
                f"This lesson explains {input.lesson_pack.source_understanding.inferred_topic} "
                "in simple steps."
            ),
            confidence=0.82,
            follow_up_suggestion="Would you like one practice question with a hint?",
            source_limited=True,
        )

    async def improve_lesson(self, input: ImproveLessonInput) -> LessonPack:
        pack = input.lesson_pack.model_copy(deep=True)
        pack.teacher_pack.teacher_review_checklist.append(
            f"Improvement requested: {input.instruction}"
        )
        return pack

    async def translate_lesson(self, input: TranslateLessonInput) -> LessonPack:
        pack = input.lesson_pack.model_copy(deep=True)
        pack.language = input.target_language
        pack.student_access_pack.local_language_explanation = (
            f"Local-language support note for {input.target_language}; teacher review required."
        )
        return pack

    def _pack(
        self,
        *,
        teacher_id: str,
        lesson_id: str | None,
        title: str,
        subject: str,
        grade_band: str,
        language: str,
        source: str,
    ) -> LessonPack:
        start = perf_counter()
        inferred_topic = title or subject
        latency_ms = int((perf_counter() - start) * 1000)
        return LessonPack(
            id=lesson_id or new_id(),
            title=title,
            source_understanding=SourceUnderstanding(
                title=title,
                observed_text=[
                    "Mock runtime does not inspect real source pixels.",
                    "Teacher review is required before use.",
                ],
                observed_objects=["classroom source"] if source == "image" else [],
                inferred_topic=inferred_topic,
                unclear_areas=[
                    "Source details are deterministic mock output, not Gemma vision output."
                ],
                source_language=language,
            ),
            teacher_pack=TeacherPack(
                lesson_objective=f"Learners explain the key idea of {inferred_topic}.",
                teacher_explanation=(
                    f"Introduce {inferred_topic} with a familiar classroom example, then connect "
                    "the example to the formal vocabulary."
                ),
                board_plan=[
                    "Write the topic and one guiding question.",
                    "List observed facts separately from inferences.",
                    "Draw or describe the core process step by step.",
                    "Close with a two-question check for understanding.",
                ],
                low_resource_activity=(
                    "Ask pairs to explain the concept using local objects or gestures, then share one sentence."
                ),
                worksheet=[
                    f"Define {inferred_topic} in your own words.",
                    "Mark one fact you are sure about and one point to ask the teacher.",
                    "Answer the practice question using the vocabulary list.",
                ],
                quiz=[
                    "What is the main idea of the lesson?",
                    "Which word from the vocabulary is most important?",
                    "What should you do if a source detail is unclear?",
                ],
                answer_key=[
                    "Answers should match the teacher-reviewed explanation.",
                    "Vocabulary use should be accurate and age appropriate.",
                    "Students should ask for clarification instead of guessing unclear source text.",
                ],
                assessment_questions=[
                    "Can the learner explain the concept aloud?",
                    "Can the learner answer one application question?",
                ],
                homework="Listen to the summary once, then answer two practice questions in your notebook.",
                differentiated_explanations=[
                    "For audio-first learners: start with the listening script.",
                    "For advanced learners: ask for one real-life application.",
                ],
                local_language_support="Provide examples in the learner's home language where useful.",
                teacher_review_checklist=[
                    "Check that the source interpretation is correct.",
                    "Remove or correct any mock-only assumptions.",
                    "Confirm age appropriateness and local-language wording.",
                ],
            ),
            student_access_pack=StudentAccessPack(
                listen_first_audio_script=(
                    f"Today we are learning about {inferred_topic}. First, listen for the main idea. "
                    "Then notice the important words. If anything is unclear, ask your teacher."
                ),
                screen_reader_summary=(
                    f"Lesson topic: {inferred_topic}. The lesson gives a simple explanation, "
                    "practice questions, vocabulary, and a revision checklist."
                ),
                visual_description=(
                    "The original classroom source is not stored by default. This mock output gives "
                    "a safe textual description for accessibility review."
                ),
                simple_explanation=(
                    f"{inferred_topic} can be understood by breaking it into small steps and checking "
                    "each step with an example."
                ),
                local_language_explanation="Simple Hindi support can be reviewed and expanded by the teacher.",
                vocabulary=["observe", "explain", "evidence", "review"],
                practice_questions=[
                    f"What is one thing you learned about {inferred_topic}?",
                    "Which part do you want the teacher to explain again?",
                ],
                hints_answers=[
                    "Hint: Use the screen-reader summary.",
                    "Answer: Ask about the unclear part instead of guessing.",
                ],
                revision_checklist=[
                    "I listened to the explanation.",
                    "I know the key words.",
                    "I tried the practice questions.",
                ],
                independence_tips=[
                    "Replay the audio script once before asking for help.",
                    "Use the vocabulary list while answering.",
                ],
                qna_context=f"Only answer questions about {inferred_topic} and this lesson pack.",
            ),
            confidence_notes=ConfidenceNotes(
                overall_confidence=0.78,
                notes=["Deterministic mock generation completed successfully."],
                teacher_review_warnings=[
                    "Mock runtime did not call Gemma or inspect the real source image.",
                    "Do not present this as hosted Gemma output.",
                ],
            ),
            trace=GemmaTrace(
                runtime=RuntimeMode.MOCK,
                model=self.model,
                local_only=True,
                hosted_api_used=False,
                latency_ms=latency_ms,
                schema_status=SchemaStatus.PASSED,
                fallback_used=False,
                image_metadata=ImageTraceMetadata(source_image_stored=False),
                warnings=[
                    TraceWarning(
                        code="MOCK_RUNTIME",
                        message="Deterministic mock runtime used; no Gemma API call was made.",
                    )
                ],
                confidence_notes=[
                    "Mock output is structurally complete but requires teacher review."
                ],
                unclear_source_areas=["All source-specific visual details require teacher review."],
                teacher_review_required=True,
            ),
            accessibility=LessonAccessibilityMetadata(local_language_ready=True),
            status="generated",
            created_by=teacher_id,
            created_by_role="teacher",
            language=language,
            subject=subject,
            grade_band=grade_band,
            tags=[subject.lower(), "mock", "accessible"],
            search_text=f"{title} {subject} {grade_band}",
        )
