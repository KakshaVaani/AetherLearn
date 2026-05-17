from __future__ import annotations

from secrets import token_urlsafe

from shared_schemas import Classroom, CreateClassroomRequest, JoinCodeResponse
from shared_utils.dates import utc_in
from shared_utils.errors import NotFoundError

from ..repository.class_subject_repository import ClassSubjectRepository
from ..repository.classroom_repository import ClassroomRepository


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


class ClassroomService:
    def __init__(self, classrooms: ClassroomRepository, subjects: ClassSubjectRepository) -> None:
        self.classrooms = classrooms
        self.subjects = subjects

    async def create_classroom(self, teacher_id: str, payload: CreateClassroomRequest) -> Classroom:
        section_normalized = normalize_text(payload.section or payload.name)
        item = await self.classrooms.find_matching_classroom(
            school_id=payload.school_id,
            grade=payload.grade,
            section_normalized=section_normalized,
        )
        if not item:
            for classroom in await self.classrooms.list_for_school(payload.school_id):
                existing_section = normalize_text(classroom.get("section") or classroom.get("name"))
                if classroom.get("grade") == payload.grade and existing_section == section_normalized:
                    item = classroom
                    break
        if item:
            teacher_ids = list(dict.fromkeys([*item.get("teacherIds", []), teacher_id]))
            patch = {"teacherIds": teacher_ids, "sectionNormalized": section_normalized}
            if teacher_ids != item.get("teacherIds", []) or item.get("sectionNormalized") != section_normalized:
                item = await self.classrooms.update(item["id"], patch) or item
        else:
            item = await self.classrooms.create(
                {
                    "schoolId": payload.school_id,
                    "name": payload.name,
                    "grade": payload.grade,
                    "section": payload.section,
                    "sectionNormalized": section_normalized,
                    "createdBy": teacher_id,
                    "teacherIds": [teacher_id],
                    "joinCode": None,
                }
            )
        subject_names = [payload.subject] if payload.subject else []
        subject_names.extend(payload.subjects)
        seen_subjects: set[str] = set()
        for subject_name in subject_names:
            normalized = subject_name.strip()
            subject_normalized = normalize_text(normalized)
            if not normalized or subject_normalized in seen_subjects:
                continue
            seen_subjects.add(subject_normalized)
            existing_subject = await self.subjects.find_for_class_subject_teacher(
                item["id"], subject_normalized, teacher_id
            )
            if not existing_subject:
                for class_subject in await self.subjects.list_for_class(item["id"]):
                    if (
                        class_subject.get("teacherId") == teacher_id
                        and normalize_text(class_subject.get("subject")) == subject_normalized
                    ):
                        existing_subject = class_subject
                        break
            if not existing_subject:
                await self.subjects.create(
                    {
                        "schoolId": payload.school_id,
                        "classroomId": item["id"],
                        "subject": normalized,
                        "subjectNormalized": subject_normalized,
                        "teacherId": teacher_id,
                    }
                )
        return Classroom.model_validate(item)

    async def list_for_teacher(self, teacher_id: str) -> list[Classroom]:
        return [
            Classroom.model_validate(item)
            for item in await self.classrooms.list_for_teacher(teacher_id)
        ]

    async def list_for_teacher_with_subjects(self, teacher_id: str) -> list[dict]:
        classes = await self.classrooms.list_for_teacher(teacher_id)
        result_by_key = {}
        for item in classes:
            key = (
                item.get("schoolId"),
                item.get("grade"),
                normalize_text(item.get("section") or item.get("name")),
            )
            current = item | {"subjects": await self.subjects.list_for_class(item["id"])}
            previous = result_by_key.get(key)
            if not previous or str(current.get("updatedAt", "")) > str(previous.get("updatedAt", "")):
                result_by_key[key] = current
        return list(result_by_key.values())

    async def get(self, classroom_id: str) -> Classroom:
        item = await self.classrooms.get(classroom_id)
        if not item:
            raise NotFoundError("Classroom not found")
        return Classroom.model_validate(item)

    async def get_with_subjects(self, classroom_id: str) -> dict:
        item = await self.classrooms.get(classroom_id)
        if not item:
            raise NotFoundError("Classroom not found")
        return item | {"subjects": await self.subjects.list_for_class(classroom_id)}

    async def join_code(self, classroom_id: str) -> JoinCodeResponse:
        classroom = await self.get(classroom_id)
        if classroom.join_code:
            return JoinCodeResponse(
                classroom_id=classroom.id, code=classroom.join_code, expires_at=utc_in(days=30)
            )
        code = token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
        await self.classrooms.update(classroom.id, {"joinCode": code})
        return JoinCodeResponse(classroom_id=classroom.id, code=code, expires_at=utc_in(days=30))
