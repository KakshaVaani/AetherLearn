from __future__ import annotations

from shared_schemas import AssignmentProgress

from ..repository.progress_repository import ProgressRepository


class ProgressService:
    def __init__(self, progress: ProgressRepository) -> None:
        self.progress = progress

    async def update(self, student_id: str, lesson_id: str, patch: dict) -> AssignmentProgress:
        item = await self.progress.upsert(student_id, lesson_id, patch)
        return AssignmentProgress.model_validate(item)
