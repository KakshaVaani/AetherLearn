from __future__ import annotations

from shared_schemas import Classroom, Enrollment
from shared_utils.errors import NotFoundError, ValidationAppError

from ..repository.classroom_repository import ClassroomRepository
from ..repository.enrollment_repository import EnrollmentRepository


class EnrollmentService:
    def __init__(self, classrooms: ClassroomRepository, enrollments: EnrollmentRepository) -> None:
        self.classrooms = classrooms
        self.enrollments = enrollments

    async def join_class(self, student_id: str, code: str) -> Enrollment:
        classroom = await self.classrooms.find_by_join_code(code)
        if not classroom:
            raise ValidationAppError("Invalid class join code")
        item = await self.enrollments.create(
            {
                "schoolId": classroom["schoolId"],
                "classroomId": classroom["id"],
                "studentId": student_id,
                "status": "active",
            }
        )
        return Enrollment.model_validate(item)

    async def list_student_classes(self, student_id: str) -> list[Classroom]:
        enrollments = await self.enrollments.list_for_student(student_id)
        classes = []
        for enrollment in enrollments:
            classroom = await self.classrooms.get(enrollment["classroomId"])
            if classroom:
                classes.append(Classroom.model_validate(classroom))
        return classes

    async def class_students(self, classroom_id: str) -> list[Enrollment]:
        classroom = await self.classrooms.get(classroom_id)
        if not classroom:
            raise NotFoundError("Classroom not found")
        return [
            Enrollment.model_validate(item)
            for item in await self.enrollments.list_for_class(classroom_id)
        ]
