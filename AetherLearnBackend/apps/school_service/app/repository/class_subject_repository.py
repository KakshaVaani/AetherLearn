from typing import Any


class ClassSubjectRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def list_for_class(self, classroom_id: str) -> list[dict]:
        return await self.repo.list(classroomId=classroom_id)

    async def list_for_teacher(self, teacher_id: str) -> list[dict]:
        return await self.repo.list(teacherId=teacher_id)
