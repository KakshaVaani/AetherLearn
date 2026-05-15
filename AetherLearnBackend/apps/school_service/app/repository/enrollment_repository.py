from typing import Any


class EnrollmentRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        existing = await self.repo.find_one(
            studentId=data["studentId"], classroomId=data["classroomId"]
        )
        return existing or await self.repo.insert(data)

    async def list_for_class(self, classroom_id: str) -> list[dict]:
        return await self.repo.list(classroomId=classroom_id)

    async def list_for_student(self, student_id: str) -> list[dict]:
        return await self.repo.list(studentId=student_id)

    async def check(self, student_id: str, classroom_id: str) -> bool:
        return await self.repo.find_one(studentId=student_id, classroomId=classroom_id) is not None
