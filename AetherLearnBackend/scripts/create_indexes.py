from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from pymongo import ASCENDING, TEXT

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

INDEXES = {
    "aetherlearn_auth": {
        "users": [
            ("emailNormalized", ASCENDING, True),
            ("role", ASCENDING, False),
            ("schoolIds", ASCENDING, False),
        ],
        "refresh_tokens": [("userId", ASCENDING, False), ("tokenHash", ASCENDING, True)],
    },
    "aetherlearn_school": {
        "schools": [("name", ASCENDING, False)],
        "classrooms": [("schoolId", ASCENDING, False), ("joinCode", ASCENDING, True)],
        "class_subjects": [("classroomId", ASCENDING, False), ("teacherId", ASCENDING, False)],
        "enrollments": [("studentId", ASCENDING, False), ("classroomId", ASCENDING, False)],
    },
    "aetherlearn_lessons": {
        "lesson_packs": [
            ("createdBy", ASCENDING, False),
            ("schoolId", ASCENDING, False),
            ("classroomId", ASCENDING, False),
            ("visibility", ASCENDING, False),
            ("status", ASCENDING, False),
            ("createdAt", ASCENDING, False),
            ("searchText", TEXT, False),
        ],
        "lesson_access_codes": [("code", ASCENDING, True)],
    },
    "aetherlearn_assignments": {
        "assignments": [
            ("studentId", ASCENDING, False),
            ("teacherId", ASCENDING, False),
            ("lessonId", ASCENDING, False),
            ("classroomId", ASCENDING, False),
            ("status", ASCENDING, False),
        ],
    },
    "aetherlearn_commons": {
        "commons_lessons": [
            ("lessonId", ASCENDING, True),
            ("subject", ASCENDING, False),
            ("gradeBand", ASCENDING, False),
            ("language", ASCENDING, False),
            ("tags", ASCENDING, False),
            ("searchText", TEXT, False),
        ],
        "commons_collections": [("title", ASCENDING, False)],
    },
    "aetherlearn_review": {
        "commons_reviews": [
            ("status", ASCENDING, False),
            ("lessonId", ASCENDING, False),
            ("submittedBy", ASCENDING, False),
        ],
        "moderation_reports": [("status", ASCENDING, False)],
    },
    "aetherlearn_sync": {
        "sync_operations": [
            ("userId", ASCENDING, False),
            ("deviceId", ASCENDING, False),
            ("operationId", ASCENDING, True),
        ],
        "device_states": [("userId", ASCENDING, False), ("deviceId", ASCENDING, False)],
    },
    "aetherlearn_exports": {
        "export_jobs": [("userId", ASCENDING, False), ("status", ASCENDING, False)],
        "kvpack_manifests": [("contentHash", ASCENDING, False)],
    },
    "aetherlearn_notifications": {
        "notifications": [
            ("userId", ASCENDING, False),
            ("readAt", ASCENDING, False),
            ("createdAt", ASCENDING, False),
        ],
    },
    "aetherlearn_storage": {
        "object_metadata": [
            ("ownerId", ASCENDING, False),
            ("objectKey", ASCENDING, True),
            ("purpose", ASCENDING, False),
        ],
    },
}


async def main() -> None:
    client = AsyncMongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    for db_name, collections in INDEXES.items():
        db = client[db_name]
        for collection_name, indexes in collections.items():
            collection = db[collection_name]
            for field, direction, unique in indexes:
                await collection.create_index([(field, direction)], unique=unique)
    await client.close()
    print("Indexes created")


if __name__ == "__main__":
    asyncio.run(main())
