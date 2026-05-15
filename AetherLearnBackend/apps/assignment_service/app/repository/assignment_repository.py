from typing import Any


def _dedupe_by_id(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    result: list[dict] = []
    for row in rows:
        row_id = str(row.get("id", ""))
        if row_id in seen:
            continue
        seen.add(row_id)
        result.append(row)
    return result


class AssignmentRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def create(self, data: dict) -> dict:
        existing = None
        if data.get("studentId"):
            existing = await self.repo.find_one(
                lessonId=data["lessonId"], studentId=data["studentId"]
            )
        return existing or await self.repo.insert(data)

    async def get(self, assignment_id: str) -> dict | None:
        return await self.repo.get(assignment_id)

    async def list_for_teacher(self, teacher_id: str) -> list[dict]:
        return await self.repo.list(teacherId=teacher_id)

    async def list_for_student(
        self, student_id: str, classroom_ids: list[str] | None = None
    ) -> list[dict]:
        rows = await self.repo.list(studentId=student_id)
        for classroom_id in classroom_ids or []:
            rows.extend(await self.repo.list(studentId=None, classroomId=classroom_id))
        return _dedupe_by_id(rows)

    async def list_for_lesson_student(
        self,
        lesson_id: str,
        student_id: str,
        classroom_ids: list[str] | None = None,
    ) -> list[dict]:
        rows = await self.repo.list(lessonId=lesson_id, studentId=student_id)
        for classroom_id in classroom_ids or []:
            rows.extend(
                await self.repo.list(lessonId=lesson_id, studentId=None, classroomId=classroom_id)
            )
        return _dedupe_by_id(rows)

    async def list_for_classroom(self, classroom_id: str) -> list[dict]:
        return await self.repo.list(classroomId=classroom_id)
