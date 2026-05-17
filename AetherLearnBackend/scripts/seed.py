from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:
    from pymongo.asynchronous import AsyncMongoClient
except ImportError:
    from pymongo import AsyncMongoClient

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT),
    str(ROOT / "packages" / "shared_schemas"),
    str(ROOT / "packages" / "shared_events"),
    str(ROOT / "packages" / "shared_utils"),
    str(ROOT / "packages" / "service_auth"),
    str(ROOT / "packages" / "api_client"),
]

from shared_schemas import (
    ConfidenceNotes,
    GemmaTrace,
    ImageTraceMetadata,
    LessonAccessibilityMetadata,
    LessonPack,
    RuntimeMode,
    SchemaStatus,
    SourceUnderstanding,
    StudentAccessPack,
    TeacherPack,
    TraceWarning,
)

from apps.auth_service.app.security.password import hash_password

SCHOOL_ID = "school-gms"
SCHOOL_NAME = "AtherLearn Demo School"
SEED_VERSION = "detailed-demo-v3"
SEEDED_AT = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
DEMO_PASSWORD = "demo1234"


async def upsert(collection: Any, key: dict, data: dict) -> dict:
    existing = await collection.find_one(key)
    if existing:
        await collection.update_one(key, {"$set": data})
        existing.update(data)
        existing.pop("_id", None)
        return existing
    await collection.insert_one(data)
    return data


async def clear_collection(collection: Any) -> int:
    result = await collection.delete_many({})
    return int(getattr(result, "deleted_count", 0))


async def reset_demo_database(
    *,
    auth: Any,
    school_db: Any,
    lesson_db: Any,
    assignment_db: Any,
    commons_db: Any,
    review_db: Any,
) -> dict[str, int]:
    """Clear local learning data so the demo DB contains only this seed story."""
    counts: dict[str, int] = {}
    collections = {
        "school.schools": school_db.schools,
        "school.classrooms": school_db.classrooms,
        "school.class_subjects": school_db.class_subjects,
        "school.enrollments": school_db.enrollments,
        "lessons.lesson_packs": lesson_db.lesson_packs,
        "lessons.lesson_access_codes": lesson_db.lesson_access_codes,
        "assignments.assignments": assignment_db.assignments,
        "assignments.student_progress": assignment_db.student_progress,
        "assignments.lesson_access_claims": assignment_db.lesson_access_claims,
        "commons.commons_lessons": commons_db.commons_lessons,
        "commons.commons_collections": commons_db.commons_collections,
        "commons.lesson_forks": commons_db.lesson_forks,
        "commons.commons_reports": commons_db.commons_reports,
        "review.commons_reviews": review_db.commons_reviews,
        "review.review_decisions": review_db.review_decisions,
        "review.moderation_reports": review_db.moderation_reports,
    }
    for name, collection in collections.items():
        counts[name] = await clear_collection(collection)

    demo_users_filter = {
        "$or": [
            {"emailNormalized": {"$regex": "@aetherlearn\\.demo$"}},
            {"id": {"$in": [user["id"] for user in TEACHERS] + [row["id"] for row in STUDENTS]}},
        ]
    }
    result = await auth.users.delete_many(demo_users_filter)
    counts["auth.demo_users"] = int(getattr(result, "deleted_count", 0))
    return counts


def accessibility_profile(
    mode: str, preferred_language: str, reading_level: str | None = None
) -> dict:
    return {
        "needsAudioFirst": mode in {"Blind / Low Vision", "Slow Learner"},
        "needsScreenReaderSupport": mode == "Blind / Low Vision",
        "needsSimpleLanguage": mode in {"Dyslexia Friendly", "Slow Learner"},
        "needsDyslexiaFriendly": mode == "Dyslexia Friendly",
        "needsLocalLanguage": preferred_language in {"hi", "ur"},
        "preferredLanguage": preferred_language,
        "readingLevel": reading_level,
        "ttsSpeed": 0.9 if mode in {"Blind / Low Vision", "Slow Learner"} else 1.0,
        "fontScale": 1.15 if mode in {"Blind / Low Vision", "Dyslexia Friendly"} else 1.0,
        "highContrast": mode == "Blind / Low Vision",
        "reduceMotion": mode in {"Blind / Low Vision", "Slow Learner"},
    }


def runtime_from_label(label: str) -> RuntimeMode:
    if label == "Hosted Gemma":
        return RuntimeMode.GEMINI
    if label == "Local Ollama":
        return RuntimeMode.OLLAMA
    return RuntimeMode.MOCK


def latency_to_ms(value: str) -> int:
    cleaned = value.strip().lower()
    try:
        if cleaned.endswith("ms"):
            return int(float(cleaned[:-2]))
        if cleaned.endswith("s"):
            return int(float(cleaned[:-1]) * 1000)
        return int(float(cleaned))
    except ValueError:
        return 0


def lesson_status(value: str) -> str:
    if value in {"Approved", "Exported"}:
        return "published"
    if value == "Needs Review":
        return "pending_review"
    return "draft"


def demo_class_coverage() -> str:
    lesson_counts = {
        classroom["id"]: sum(1 for lesson in LESSONS if lesson["classroomId"] == classroom["id"])
        for classroom in CLASSROOMS
    }
    assignment_counts = {
        classroom["id"]: sum(
            1 for assignment in ASSIGNMENTS if assignment["classroomId"] == classroom["id"]
        )
        for classroom in CLASSROOMS
    }
    return "; ".join(
        f"{classroom['name']}: {lesson_counts[classroom['id']]} notes, "
        f"{assignment_counts[classroom['id']]} assignments"
        for classroom in CLASSROOMS
    )



def build_lesson_pack(seed: dict) -> LessonPack:
    warnings = seed.get("warnings", [])
    runtime = runtime_from_label(seed["runtimeMode"])
    local_only = runtime != RuntimeMode.GEMINI

    return LessonPack(
        id=seed["id"],
        title=seed["title"],
        source_understanding=SourceUnderstanding(
            title=seed["title"],
            observed_text=[*seed["detectedText"], *seed.get("equations", [])],
            observed_objects=seed["diagramElements"],
            inferred_topic=seed["topicTitle"],
            unclear_areas=seed.get("unclearRegions", []),
            source_language=seed["language"],
        ),
        teacher_pack=TeacherPack(
            lesson_objective=seed["objective"],
            teacher_explanation=seed["teachingScript"],
            board_plan=seed["keyConcepts"],
            low_resource_activity=seed["classroomActivity"],
            worksheet=seed["worksheet"],
            quiz=seed["practiceQuestions"],
            answer_key=seed["answerKey"],
            assessment_questions=seed["worksheet"],
            homework=seed["homework"],
            differentiated_explanations=seed["differentiatedSupport"].split("\n"),
            local_language_support=seed.get("localLanguageSupport"),
            teacher_review_checklist=[*seed["misconceptions"], *warnings],
        ),
        student_access_pack=StudentAccessPack(
            listen_first_audio_script=seed["audioStudyScript"],
            screen_reader_summary=seed["screenReaderSummary"],
            visual_description=seed["visualDescription"],
            simple_explanation=seed["stepByStepExplanation"],
            local_language_explanation=seed.get("localLanguageSupport"),
            vocabulary=[item["term"] for item in seed["vocabulary"]],
            practice_questions=seed["practiceQuestions"],
            hints_answers=seed["selfCheckAnswers"],
            revision_checklist=seed["steps"],
            independence_tips=[
                "Listen to the summary once before answering.",
                "Use the vocabulary list when writing your response.",
            ],
            qna_context=" ".join(
                [
                    seed["screenReaderSummary"],
                    seed["stepByStepExplanation"],
                    " ".join(seed["practiceQuestions"]),
                ]
            ),
        ),
        confidence_notes=ConfidenceNotes(
            overall_confidence=seed["confidence"] / 100,
            notes=seed["confidenceNotes"],
            teacher_review_warnings=warnings,
        ),
        trace=GemmaTrace(
            runtime=runtime,
            model=seed["model"],
            local_only=local_only,
            hosted_api_used=not local_only,
            latency_ms=latency_to_ms(seed["latency"]),
            schema_status=SchemaStatus.PASSED,
            fallback_used=False,
            image_metadata=ImageTraceMetadata(
                source_image_stored=False,
                quality_warnings=seed.get("unclearRegions", []),
            ),
            warnings=[TraceWarning(code="TEACHER_REVIEW", message=warning) for warning in warnings],
            confidence_notes=seed["confidenceNotes"],
            unclear_source_areas=seed.get("unclearRegions", []),
            teacher_review_required=bool(warnings) or seed["status"] == "Needs Review",
            generated_at=SEEDED_AT,
        ),
        accessibility=LessonAccessibilityMetadata(
            audio_first_ready=True,
            screen_reader_ready=True,
            simple_language_ready=True,
            local_language_ready=bool(seed.get("localLanguageSupport")),
            estimated_listening_minutes=3,
        ),
        visibility="class",
        status=lesson_status(seed["status"]),
        source_image_metadata={
            "sourceType": seed["sourceType"],
            "demoSeed": True,
            "confidence": seed["confidence"],
        },
        created_by="teacher-demo",
        created_by_role="teacher",
        school_id=SCHOOL_ID,
        classroom_id=seed["classroomId"],
        class_subject_id=seed["classSubjectId"],
        chapter_id=seed["chapterId"],
        chapter_title=seed["chapterTitle"],
        topic_id=seed["topicId"],
        topic_title=seed["topicTitle"],
        language=seed["language"],
        subject=seed["subject"],
        grade_band=seed["grade"],
        tags=[seed["subject"].lower(), seed["grade"].lower(), seed["topicTitle"].lower()],
        search_text=f"{seed['title']} {seed['subject']} {seed['grade']} {' '.join(seed['detectedText'])}",
    )


TEACHERS = [
    {
        "id": "teacher-demo",
        "name": "Ananya Sharma",
        "email": "teacher@aetherlearn.demo",
        "subjects": ["Science", "Math"],
        "grades": ["Grade 7", "Grade 8"],
        "classroomIds": ["class-7a", "class-7b", "class-8a", "class-8b"],
    },
    {
        "id": "teacher-leela",
        "name": "Leela Nair",
        "email": "leela@aetherlearn.demo",
        "subjects": ["Science"],
        "grades": ["Grade 7"],
        "classroomIds": ["class-7a", "class-7b"],
    },
    {
        "id": "teacher-raj",
        "name": "Raj Mehta",
        "email": "raj@aetherlearn.demo",
        "subjects": ["Math"],
        "grades": ["Grade 8"],
        "classroomIds": ["class-8a", "class-8b"],
    },
]

STUDENTS = [
    {
        "id": "student-demo",
        "name": "Ravi Kumar",
        "email": "student@aetherlearn.demo",
        "mode": "Blind / Low Vision",
        "language": "hi",
        "readingLevel": "On Track",
    },
    {
        "id": "student-meera",
        "name": "Meera Nair",
        "email": "meera@aetherlearn.demo",
        "mode": "Standard",
        "language": "en",
        "readingLevel": "Advanced",
    },
    {
        "id": "student-neha",
        "name": "Neha Verma",
        "email": "neha@aetherlearn.demo",
        "mode": "Slow Learner",
        "language": "en",
        "readingLevel": "Emerging",
    },
    {
        "id": "student-zoya",
        "name": "Zoya Khan",
        "email": "zoya@aetherlearn.demo",
        "mode": "Multilingual",
        "language": "ur",
        "readingLevel": "On Track",
    },
    {
        "id": "student-ishita",
        "name": "Ishita Rao",
        "email": "ishita@aetherlearn.demo",
        "mode": "Dyslexia Friendly",
        "language": "en",
        "readingLevel": "On Track",
    },
    {
        "id": "student-aarav",
        "name": "Aarav Singh",
        "email": "aarav@aetherlearn.demo",
        "mode": "Dyslexia Friendly",
        "language": "en",
        "readingLevel": "On Track",
    },
    {
        "id": "student-rafiq",
        "name": "Rafiq Ansari",
        "email": "rafiq@aetherlearn.demo",
        "mode": "Multilingual",
        "language": "hi",
        "readingLevel": "On Track",
    },
    {
        "id": "student-kiran",
        "name": "Kiran Patel",
        "email": "kiran@aetherlearn.demo",
        "mode": "Standard",
        "language": "en",
        "readingLevel": "Advanced",
    },
    {
        "id": "student-dev",
        "name": "Dev Malhotra",
        "email": "dev@aetherlearn.demo",
        "mode": "Slow Learner",
        "language": "hi",
        "readingLevel": "Emerging",
    },
    {
        "id": "student-tara",
        "name": "Tara Iyer",
        "email": "tara@aetherlearn.demo",
        "mode": "Standard",
        "language": "en",
        "readingLevel": "Advanced",
    },
]

CLASSROOMS = [
    {
        "id": "class-7a",
        "name": "Class 7A",
        "grade": "Grade 7",
        "section": "A",
        "joinCode": "CLASS7A",
        "teacherIds": ["teacher-demo", "teacher-leela"],
        "students": 3,
        "accessibilityProfiles": 2,
        "accessibilityBreakdown": {
            "Blind / Low Vision": 1,
            "Dyslexia Friendly": 0,
            "Multilingual": 0,
            "Slow Learner": 1,
            "Standard": 1,
        },
    },
    {
        "id": "class-7b",
        "name": "Class 7B",
        "grade": "Grade 7",
        "section": "B",
        "joinCode": "CLASS7B",
        "teacherIds": ["teacher-demo", "teacher-leela"],
        "students": 2,
        "accessibilityProfiles": 2,
        "accessibilityBreakdown": {
            "Blind / Low Vision": 0,
            "Dyslexia Friendly": 1,
            "Multilingual": 1,
            "Slow Learner": 0,
            "Standard": 0,
        },
    },
    {
        "id": "class-8a",
        "name": "Class 8A",
        "grade": "Grade 8",
        "section": "A",
        "joinCode": "CLASS8A",
        "teacherIds": ["teacher-demo", "teacher-raj"],
        "students": 3,
        "accessibilityProfiles": 2,
        "accessibilityBreakdown": {
            "Blind / Low Vision": 0,
            "Dyslexia Friendly": 1,
            "Multilingual": 1,
            "Slow Learner": 0,
            "Standard": 1,
        },
    },
    {
        "id": "class-8b",
        "name": "Class 8B",
        "grade": "Grade 8",
        "section": "B",
        "joinCode": "CLASS8B",
        "teacherIds": ["teacher-demo", "teacher-raj"],
        "students": 2,
        "accessibilityProfiles": 1,
        "accessibilityBreakdown": {
            "Blind / Low Vision": 0,
            "Dyslexia Friendly": 0,
            "Multilingual": 0,
            "Slow Learner": 1,
            "Standard": 1,
        },
    },
]

CLASS_SUBJECTS = [
    ("subject-7a-science", "class-7a", "Science", "teacher-demo"),
    ("subject-7b-science", "class-7b", "Science", "teacher-demo"),
    ("subject-8a-math", "class-8a", "Math", "teacher-demo"),
    ("subject-8b-math", "class-8b", "Math", "teacher-demo"),
]

ROSTERS = {
    "class-7a": ["student-demo", "student-meera", "student-neha"],
    "class-7b": ["student-zoya", "student-ishita"],
    "class-8a": ["student-aarav", "student-rafiq", "student-kiran"],
    "class-8b": ["student-dev", "student-tara"],
}

FRONTEND_DATA = ROOT.parent / "AtherLearnFrontend" / "data"


def load_demo_json(filename: str) -> Any:
    with (FRONTEND_DATA / filename).open(encoding="utf-8") as file:
        return json.load(file)


LESSONS: list[dict[str, Any]] = load_demo_json("demoLessonSeeds.json")
ASSIGNMENTS: list[dict[str, Any]] = load_demo_json("demoAssignments.json")
PROGRESS_ROWS: list[list[Any]] = load_demo_json("demoProgressRows.json")


async def main() -> None:
    if os.getenv("SEED_DEMO_DATA", "true").lower() != "true":
        print("SEED_DEMO_DATA is not true; skipping")
        return

    client = AsyncMongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    auth = client.aetherlearn_auth
    school_db = client.aetherlearn_school
    lesson_db = client.aetherlearn_lessons
    assignment_db = client.aetherlearn_assignments
    commons_db = client.aetherlearn_commons
    review_db = client.aetherlearn_review

    reset_counts = await reset_demo_database(
        auth=auth,
        school_db=school_db,
        lesson_db=lesson_db,
        assignment_db=assignment_db,
        commons_db=commons_db,
        review_db=review_db,
    )

    password = hash_password(DEMO_PASSWORD)
    for item in TEACHERS:
        await upsert(
            auth.users,
            {"id": item["id"]},
            {
                "id": item["id"],
                "name": item["name"],
                "email": item["email"],
                "emailNormalized": item["email"].lower(),
                "passwordHash": password,
                "role": "teacher",
                "schoolIds": [SCHOOL_ID],
                "activeSchoolId": SCHOOL_ID,
                "preferredLanguage": "en",
                "accessibilityProfile": accessibility_profile("Standard", "en"),
                "teacherProfile": {
                    "subjects": item["subjects"],
                    "grades": item["grades"],
                    "classroomIds": item["classroomIds"],
                    "verifiedEducator": True,
                },
                "educatorProfile": None,
                "active": True,
                "tokenVersion": 1,
                "demoSeed": SEED_VERSION,
            },
        )

    for item in STUDENTS:
        await upsert(
            auth.users,
            {"id": item["id"]},
            {
                "id": item["id"],
                "name": item["name"],
                "email": item["email"],
                "emailNormalized": item["email"].lower(),
                "passwordHash": password,
                "role": "student",
                "schoolIds": [SCHOOL_ID],
                "activeSchoolId": SCHOOL_ID,
                "preferredLanguage": item["language"],
                "accessibilityProfile": accessibility_profile(
                    item["mode"], item["language"], item["readingLevel"]
                ),
                "teacherProfile": None,
                "educatorProfile": None,
                "active": True,
                "tokenVersion": 1,
                "demoSeed": SEED_VERSION,
            },
        )

    extra_users = [
        ("reviewer-demo", "Reviewer Demo", "reviewer@aetherlearn.demo", "reviewer"),
        ("admin-demo", "Platform Admin", "admin@aetherlearn.demo", "platform_admin"),
    ]
    for user_id, name, email, role in extra_users:
        await upsert(
            auth.users,
            {"id": user_id},
            {
                "id": user_id,
                "name": name,
                "email": email,
                "emailNormalized": email.lower(),
                "passwordHash": password,
                "role": role,
                "schoolIds": [SCHOOL_ID],
                "activeSchoolId": SCHOOL_ID,
                "preferredLanguage": "en",
                "accessibilityProfile": accessibility_profile("Standard", "en"),
                "teacherProfile": None,
                "educatorProfile": None,
                "active": True,
                "tokenVersion": 1,
                "demoSeed": SEED_VERSION,
            },
        )

    await upsert(
        school_db.schools,
        {"id": SCHOOL_ID},
        {
            "id": SCHOOL_ID,
            "name": SCHOOL_NAME,
            "district": "Demo District",
            "state": "Karnataka",
            "country": "IN",
            "adminIds": ["admin-demo"],
            "demoSeed": SEED_VERSION,
        },
    )

    for classroom in CLASSROOMS:
        await upsert(
            school_db.classrooms,
            {"id": classroom["id"]},
            {
                "id": classroom["id"],
                "schoolId": SCHOOL_ID,
                "name": classroom["name"],
                "grade": classroom["grade"],
                "section": classroom["section"],
                "sectionNormalized": classroom["section"].lower(),
                "createdBy": "teacher-demo",
                "teacherIds": classroom["teacherIds"],
                "joinCode": classroom["joinCode"],
                "students": classroom["students"],
                "studentCount": classroom["students"],
                "accessibilityProfiles": classroom["accessibilityProfiles"],
                "accessibilityBreakdown": classroom["accessibilityBreakdown"],
                "demoSeed": SEED_VERSION,
            },
        )

    for subject_id, classroom_id, subject, teacher_id in CLASS_SUBJECTS:
        await upsert(
            school_db.class_subjects,
            {"id": subject_id},
            {
                "id": subject_id,
                "schoolId": SCHOOL_ID,
                "classroomId": classroom_id,
                "subject": subject,
                "subjectNormalized": subject.lower(),
                "teacherId": teacher_id,
                "demoSeed": SEED_VERSION,
            },
        )

    for classroom_id, student_ids in ROSTERS.items():
        for student_id in student_ids:
            await upsert(
                school_db.enrollments,
                {"id": f"enroll-{student_id}-{classroom_id}"},
                {
                    "id": f"enroll-{student_id}-{classroom_id}",
                    "schoolId": SCHOOL_ID,
                    "classroomId": classroom_id,
                    "studentId": student_id,
                    "status": "active",
                    "demoSeed": SEED_VERSION,
                },
            )

    for seed in LESSONS:
        pack = build_lesson_pack(seed)
        await upsert(
            lesson_db.lesson_packs,
            {"id": pack.id},
            pack.model_dump(mode="json", by_alias=True) | {"demoSeed": SEED_VERSION},
        )

    for assignment in ASSIGNMENTS:
        await upsert(
            assignment_db.assignments,
            {"id": assignment["id"]},
            {
                "id": assignment["id"],
                "lessonId": assignment["lessonId"],
                "teacherId": "teacher-demo",
                "studentId": None,
                "classroomId": assignment["classroomId"],
                "status": assignment["status"],
                "dueAt": assignment["dueAt"],
                "instructions": "Study the accessible lesson pack before answering.",
                "title": assignment["title"],
                "answerMode": assignment["answerMode"],
                "versions": assignment["versions"],
                "questions": assignment["questions"],
                "demoSeed": SEED_VERSION,
            },
        )

    for (
        progress_id,
        assignment_id,
        lesson_id,
        student_id,
        classroom_id,
        score,
        completed,
    ) in PROGRESS_ROWS:
        await upsert(
            assignment_db.student_progress,
            {"id": progress_id},
            {
                "id": progress_id,
                "assignmentId": assignment_id,
                "lessonId": lesson_id,
                "studentId": student_id,
                "classroomId": classroom_id,
                "opened": True,
                "listened": completed,
                "practiced": completed,
                "askedQuestion": not completed,
                "downloaded": completed,
                "completed": completed,
                "lastPosition": 100 if completed else 45,
                "score": score,
                "correctCount": None if score is None else max(1, round(score / 100 * 3)),
                "totalQuestions": 3,
                "weakTopics": [] if completed else ["Needs teacher support"],
                "submittedAt": "2026-05-17T13:00:00.000Z" if completed else None,
                "answers": {},
                "demoSeed": SEED_VERSION,
            },
        )

    for index, seed in enumerate(LESSONS, start=1):
        commons_id = f"commons-{seed['id']}"
        await upsert(
            commons_db.commons_lessons,
            {"lessonId": commons_id},
            {
                "id": f"commons-row-{index}",
                "lessonId": commons_id,
                "title": seed["title"],
                "subject": seed["subject"],
                "gradeBand": seed["grade"],
                "language": seed["language"],
                "tags": [seed["subject"].lower(), seed["topicTitle"].lower()],
                "publishedBy": "teacher-demo",
                "verifiedEducator": True,
                "offlineDownloadable": True,
                "searchText": f"{seed['title']} {seed['subject']} {seed['topicTitle']}",
                "demoSeed": SEED_VERSION,
            },
        )

    await upsert(
        commons_db.commons_collections,
        {"id": "collection-classroom-demo"},
        {
            "id": "collection-classroom-demo",
            "title": "Class 7 and 8 Demo Starter Pack",
            "description": "Accessible Science and Math lessons for the seeded teacher demo.",
            "lessonIds": [f"commons-{seed['id']}" for seed in LESSONS],
            "createdBy": "reviewer-demo",
            "demoSeed": SEED_VERSION,
        },
    )

    pending_review_lesson_ids = [
        seed["id"] for seed in LESSONS if seed["status"] == "Needs Review"
    ]
    for lesson_id in pending_review_lesson_ids:
        await upsert(
            review_db.commons_reviews,
            {"id": f"review-pending-{lesson_id}"},
            {
                "id": f"review-pending-{lesson_id}",
                "lessonId": lesson_id,
                "submittedBy": "teacher-demo",
                "status": "pending",
                "checklist": {"sourceReviewed": False, "accessibilityReviewed": True},
                "demoSeed": SEED_VERSION,
            },
        )

    await client.close()
    reset_total = sum(reset_counts.values())
    print(
        "Reset local demo learning data "
        f"({reset_total} rows removed) and seeded {SCHOOL_NAME}: "
        f"{len(TEACHERS)} teachers, {len(STUDENTS)} students, "
        f"{len(CLASSROOMS)} classes, {len(LESSONS)} lesson packs, "
        f"{len(ASSIGNMENTS)} assignments, progress, Commons, and reviews."
    )
    print(f"Demo class coverage: {demo_class_coverage()}.")


if __name__ == "__main__":
    asyncio.run(main())
