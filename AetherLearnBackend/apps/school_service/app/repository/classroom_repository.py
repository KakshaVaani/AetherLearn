from typing import Any


class ClassroomRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        return await self.repo.insert(data)

    async def get(self, classroom_id: str) -> dict | None:
        return await self.repo.get(classroom_id)

    async def find_by_join_code(self, code: str) -> dict | None:
        return await self.repo.find_one(joinCode=code)

    async def find_matching_classroom(
        self,
        *,
        school_id: str,
        grade: str,
        section_normalized: str,
    ) -> dict | None:
        return await self.repo.find_one(
            schoolId=school_id,
            grade=grade,
            sectionNormalized=section_normalized,
        )

    async def list_for_teacher(self, teacher_id: str) -> list[dict]:
        return [item for item in await self.repo.list() if teacher_id in item.get("teacherIds", [])]

    async def list_for_school(self, school_id: str) -> list[dict]:
        return await self.repo.list(schoolId=school_id)

    async def update(self, classroom_id: str, data: dict) -> dict | None:
        return await self.repo.update(classroom_id, data)
