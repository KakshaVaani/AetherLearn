from __future__ import annotations

from shared_schemas import Assignment, CreateAssignmentRequest
from shared_utils.errors import ForbiddenError, NotFoundError

from ..repository.assignment_repository import AssignmentRepository
from ..repository.progress_repository import ProgressRepository


class AssignmentService:
    def __init__(self, assignments: AssignmentRepository, progress: ProgressRepository) -> None:
        self.assignments = assignments
        self.progress = progress

    async def create(self, teacher_id: str, payload: CreateAssignmentRequest) -> list[Assignment]:
        student_ids: list[str | None] = list(payload.student_ids) if payload.student_ids else [None]
        created = []
        for student_id in student_ids:
            item = await self.assignments.create(
                {
                    "lessonId": payload.lesson_id,
                    "teacherId": teacher_id,
                    "studentId": student_id,
                    "classroomId": payload.classroom_id,
                    "status": "assigned",
                    "dueAt": payload.due_at,
                    "instructions": payload.instructions,
                    "title": payload.title,
                    "answerMode": payload.answer_mode,
                    "versions": payload.versions,
                    "questions": [
                        question.model_dump(by_alias=True) for question in payload.questions
                    ],
                }
            )
            created.append(Assignment.model_validate(item))
        return created

    async def list_teacher(self, teacher_id: str) -> list[Assignment]:
        return [
            Assignment.model_validate(item)
            for item in await self.assignments.list_for_teacher(teacher_id)
        ]

    async def list_student(
        self, student_id: str, classroom_ids: list[str] | None = None
    ) -> list[Assignment]:
        return [
            Assignment.model_validate(item)
            for item in await self.assignments.list_for_student(student_id, classroom_ids)
        ]

    async def delete_for_teacher(
        self,
        teacher_id: str,
        assignment_id: str,
        role: str = "teacher",
    ) -> dict:
        assignment = await self.assignments.get(assignment_id)
        if not assignment:
            raise NotFoundError("Assignment not found")
        if (
            assignment.get("teacherId") != teacher_id
            and role not in {"school_admin", "platform_admin"}
        ):
            raise ForbiddenError("Assignment owner required")
        deleted = await self.assignments.delete(assignment_id)
        return {"deleted": deleted}
