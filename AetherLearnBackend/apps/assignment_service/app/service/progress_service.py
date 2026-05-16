from __future__ import annotations

from shared_schemas import AssignmentProgress, SubmitAssignmentRequest
from shared_utils.errors import ForbiddenError, NotFoundError

from ..repository.assignment_repository import AssignmentRepository
from ..repository.progress_repository import ProgressRepository


class ProgressService:
    def __init__(self, progress: ProgressRepository) -> None:
        self.progress = progress

    async def update(self, student_id: str, lesson_id: str, patch: dict) -> AssignmentProgress:
        item = await self.progress.upsert(student_id, lesson_id, patch)
        return AssignmentProgress.model_validate(item)

    async def submit_assignment(
        self,
        *,
        student_id: str,
        assignment_id: str,
        assignments: AssignmentRepository,
        payload: SubmitAssignmentRequest,
        classroom_ids: list[str] | None = None,
    ) -> dict:
        assignment = await assignments.get(assignment_id)
        if not assignment:
            raise NotFoundError("Assignment not found")
        assigned_student_id = assignment.get("studentId")
        if assigned_student_id is not None and assigned_student_id != student_id:
            raise ForbiddenError("Assignment is not assigned to this student")
        assigned_classroom_id = assignment.get("classroomId")
        if assigned_student_id is None and assigned_classroom_id:
            if assigned_classroom_id not in set(classroom_ids or []):
                raise ForbiddenError("Assignment is not assigned to this student's class")
        patch = {
            "assignmentId": assignment_id,
            "classroomId": assignment.get("classroomId"),
            "completed": True,
            "practiced": True,
            "score": payload.score,
            "correctCount": payload.correct_count,
            "totalQuestions": payload.total_questions,
            "weakTopics": payload.weak_topics,
            "answers": payload.answers,
            "submittedAt": payload.submitted_at,
        }
        item = await self.progress.upsert(student_id, assignment["lessonId"], patch)
        progress = AssignmentProgress.model_validate(item)
        return {
            "assignment": assignment,
            "progress": progress,
            "submitted": True,
        }
