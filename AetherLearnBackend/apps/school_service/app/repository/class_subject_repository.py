from typing import Any


class ClassSubjectRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def find_for_class_subject_teacher(
        self, classroom_id: str, subject_normalized: str, teacher_id: str
    ) -> dict | None:
        return await self.repo.find_one(
            classroomId=classroom_id,
            subjectNormalized=subject_normalized,
            teacherId=teacher_id,
        )

    async def list_for_class(self, classroom_id: str) -> list[dict]:
        return await self.repo.list(classroomId=classroom_id)

    async def list_for_teacher(self, teacher_id: str) -> list[dict]:
        return await self.repo.list(teacherId=teacher_id)
