from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

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

from apps.ai_service.app.adapters.mock_adapter import MockAdapter
from apps.auth_service.app.security.password import hash_password


async def upsert(collection, key: dict, data: dict) -> dict:
    existing = await collection.find_one(key)
    if existing:
        await collection.update_one(key, {"$set": data})
        existing.update(data)
        existing.pop("_id", None)
        return existing
    await collection.insert_one(data)
    return data


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

    password = hash_password("demo1234")
    users = [
        ("teacher-demo", "Ananya Sharma", "teacher@aetherlearn.demo", "teacher"),
        ("student-demo", "Ravi Kumar", "student@aetherlearn.demo", "student"),
        ("teacher-raj", "Raj Mehta", "raj@aetherlearn.demo", "teacher"),
        ("teacher-farah", "Farah Khan", "farah@aetherlearn.demo", "teacher"),
        ("reviewer-demo", "Reviewer Demo", "reviewer@aetherlearn.demo", "reviewer"),
        ("admin-demo", "Platform Admin", "admin@aetherlearn.demo", "platform_admin"),
    ]
    for user_id, name, email, role in users:
        await upsert(
            auth.users,
            {"id": user_id},
            {
                "id": user_id,
                "name": name,
                "email": email,
                "emailNormalized": email,
                "passwordHash": password,
                "role": role,
                "schoolIds": ["school-gms"],
                "activeSchoolId": "school-gms",
                "preferredLanguage": "hi" if role == "student" else "en",
                "accessibilityProfile": {
                    "needsAudioFirst": role == "student",
                    "needsScreenReaderSupport": role == "student",
                    "needsSimpleLanguage": role == "student",
                    "needsLocalLanguage": role == "student",
                    "preferredLanguage": "hi" if role == "student" else "en",
                },
                "teacherProfile": {
                    "subjects": ["Science"],
                    "grades": ["7"],
                    "verifiedEducator": True,
                }
                if role == "teacher"
                else None,
                "educatorProfile": None,
                "active": True,
                "tokenVersion": 1,
            },
        )

    await upsert(
        school_db.schools,
        {"id": "school-gms"},
        {
            "id": "school-gms",
            "name": "Government Middle School",
            "country": "IN",
            "adminIds": ["admin-demo"],
        },
    )
    await upsert(
        school_db.classrooms,
        {"id": "class-7a"},
        {
            "id": "class-7a",
            "schoolId": "school-gms",
            "name": "Class 7A",
            "grade": "7",
            "section": "A",
            "createdBy": "teacher-demo",
            "teacherIds": ["teacher-demo"],
            "joinCode": "CLASS7A",
        },
    )
    await upsert(
        school_db.class_subjects,
        {"id": "subject-science-7a"},
        {
            "id": "subject-science-7a",
            "schoolId": "school-gms",
            "classroomId": "class-7a",
            "subject": "Science",
            "teacherId": "teacher-demo",
        },
    )
    await upsert(
        school_db.enrollments,
        {"id": "enroll-ravi-7a"},
        {
            "id": "enroll-ravi-7a",
            "schoolId": "school-gms",
            "classroomId": "class-7a",
            "studentId": "student-demo",
            "status": "active",
        },
    )

    pack = await MockAdapter().generate_from_text(
        type(
            "GenerateInput",
            (),
            {
                "text": "Photosynthesis",
                "settings": {"subject": "Science", "gradeBand": "Class 7"},
                "teacher_id": "teacher-demo",
                "lesson_id": "lesson-photosynthesis",
            },
        )()
    )
    await upsert(
        lesson_db.lesson_packs, {"id": pack.id}, pack.model_dump(mode="json", by_alias=True)
    )
    await upsert(
        assignment_db.assignments,
        {"id": "assignment-ravi-photo"},
        {
            "id": "assignment-ravi-photo",
            "lessonId": pack.id,
            "teacherId": "teacher-demo",
            "studentId": "student-demo",
            "classroomId": "class-7a",
            "status": "assigned",
        },
    )

    topics = [
        "Photosynthesis",
        "Water Cycle",
        "Fractions",
        "Solar System",
        "Digestive System",
        "Indian Constitution Basics",
        "Algebra Basics",
        "English Grammar Tenses",
        "Electricity Basics",
        "Plant Cell Diagram",
    ]
    for index, topic in enumerate(topics, start=1):
        await upsert(
            commons_db.commons_lessons,
            {"lessonId": f"commons-{index}"},
            {
                "id": f"commons-row-{index}",
                "lessonId": f"commons-{index}",
                "title": topic,
                "subject": "Science" if index != 3 else "Mathematics",
                "gradeBand": "Class 7",
                "language": "en",
                "tags": [topic.lower()],
                "publishedBy": "teacher-demo",
                "verifiedEducator": True,
                "offlineDownloadable": True,
                "searchText": topic,
            },
        )
    await upsert(
        commons_db.commons_collections,
        {"id": "collection-approved"},
        {
            "id": "collection-approved",
            "title": "Approved Middle School Starters",
            "description": "Seeded accessible lessons.",
            "lessonIds": ["commons-1", "commons-2"],
            "createdBy": "reviewer-demo",
        },
    )
    await upsert(
        review_db.commons_reviews,
        {"id": "review-pending-photo"},
        {
            "id": "review-pending-photo",
            "lessonId": pack.id,
            "submittedBy": "teacher-demo",
            "status": "pending",
            "checklist": {},
        },
    )

    await client.close()
    print("Seeded demo data: teacher/student/reviewer/admin, Class 7A, lesson, assignment, Commons")


if __name__ == "__main__":
    asyncio.run(main())
