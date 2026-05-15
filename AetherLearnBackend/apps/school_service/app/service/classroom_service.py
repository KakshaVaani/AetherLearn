from __future__ import annotations

from secrets import token_urlsafe

from shared_schemas import Classroom, CreateClassroomRequest, JoinCodeResponse
from shared_utils.dates import utc_in
from shared_utils.errors import NotFoundError

from ..repository.class_subject_repository import ClassSubjectRepository
from ..repository.classroom_repository import ClassroomRepository


class ClassroomService:
    def __init__(self, classrooms: ClassroomRepository, subjects: ClassSubjectRepository) -> None:
        self.classrooms = classrooms
        self.subjects = subjects

    async def create_classroom(self, teacher_id: str, payload: CreateClassroomRequest) -> Classroom:
        item = await self.classrooms.create(
            {
                "schoolId": payload.school_id,
                "name": payload.name,
                "grade": payload.grade,
                "section": payload.section,
                "createdBy": teacher_id,
                "teacherIds": [teacher_id],
                "joinCode": None,
            }
        )
        if payload.subject:
            await self.subjects.create(
                {
                    "schoolId": payload.school_id,
                    "classroomId": item["id"],
                    "subject": payload.subject,
                    "teacherId": teacher_id,
                }
            )
        return Classroom.model_validate(item)

    async def list_for_teacher(self, teacher_id: str) -> list[Classroom]:
        return [
            Classroom.model_validate(item)
            for item in await self.classrooms.list_for_teacher(teacher_id)
        ]

    async def get(self, classroom_id: str) -> Classroom:
        item = await self.classrooms.get(classroom_id)
        if not item:
            raise NotFoundError("Classroom not found")
        return Classroom.model_validate(item)

    async def join_code(self, classroom_id: str) -> JoinCodeResponse:
        classroom = await self.get(classroom_id)
        code = token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
        await self.classrooms.update(classroom.id, {"joinCode": code})
        return JoinCodeResponse(classroom_id=classroom.id, code=code, expires_at=utc_in(days=30))
