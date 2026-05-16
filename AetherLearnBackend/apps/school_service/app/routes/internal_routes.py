from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import CreateClassroomRequest, CreateSchoolRequest, JoinClassRequest
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.class_subject_repository import ClassSubjectRepository
from ..repository.classroom_repository import ClassroomRepository
from ..repository.enrollment_repository import EnrollmentRepository
from ..repository.school_repository import SchoolRepository
from ..service.classroom_service import ClassroomService
from ..service.enrollment_service import EnrollmentService
from ..service.school_service import SchoolService

router = APIRouter(prefix="/internal", tags=["internal-school"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def user_context(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
    )


def repos(request: Request):
    settings = get_settings()
    db = request.app.state.mongo
    schools = SchoolRepository(repository_for(db, "schools", settings.mongodb_uri))
    classrooms = ClassroomRepository(repository_for(db, "classrooms", settings.mongodb_uri))
    subjects = ClassSubjectRepository(repository_for(db, "class_subjects", settings.mongodb_uri))
    enrollments = EnrollmentRepository(repository_for(db, "enrollments", settings.mongodb_uri))
    return schools, classrooms, subjects, enrollments


@router.post("/schools")
async def create_school(request: Request, payload: CreateSchoolRequest):
    await require_service(request)
    ctx = user_context(request)
    schools, _, _, _ = repos(request)
    return await SchoolService(schools).create_school(payload, ctx.user_id)


@router.get("/schools/{school_id}")
async def get_school(request: Request, school_id: str):
    await require_service(request)
    schools, _, _, _ = repos(request)
    return await SchoolService(schools).get_school(school_id)


@router.patch("/schools/{school_id}")
async def patch_school(request: Request, school_id: str, payload: dict):
    await require_service(request)
    schools, _, _, _ = repos(request)
    item = await schools.update(school_id, payload)
    return item


@router.get("/teacher/{teacher_id}/classes")
async def teacher_classes(request: Request, teacher_id: str):
    await require_service(request)
    _, classrooms, subjects, _ = repos(request)
    classes = await ClassroomService(classrooms, subjects).list_for_teacher(teacher_id)
    return [
        classroom.model_dump(mode="json", by_alias=True)
        | {"subjects": await subjects.list_for_class(classroom.id)}
        for classroom in classes
    ]


@router.post("/teacher/{teacher_id}/classes")
async def create_class(request: Request, teacher_id: str, payload: CreateClassroomRequest):
    await require_service(request)
    _, classrooms, subjects, _ = repos(request)
    return await ClassroomService(classrooms, subjects).create_classroom(teacher_id, payload)


@router.get("/classes/{classroom_id}")
async def get_class(request: Request, classroom_id: str):
    await require_service(request)
    _, classrooms, subjects, _ = repos(request)
    classroom = await ClassroomService(classrooms, subjects).get(classroom_id)
    return classroom.model_dump(mode="json", by_alias=True) | {
        "subjects": await subjects.list_for_class(classroom.id)
    }


@router.patch("/classes/{classroom_id}")
async def patch_class(request: Request, classroom_id: str, payload: dict):
    await require_service(request)
    _, classrooms, _, _ = repos(request)
    return await classrooms.update(classroom_id, payload)


@router.post("/classes/{classroom_id}/join-code")
async def join_code(request: Request, classroom_id: str):
    await require_service(request)
    _, classrooms, subjects, _ = repos(request)
    return await ClassroomService(classrooms, subjects).join_code(classroom_id)


@router.get("/classes/{classroom_id}/students")
async def class_students(request: Request, classroom_id: str):
    await require_service(request)
    _, classrooms, _, enrollments = repos(request)
    return await EnrollmentService(classrooms, enrollments).class_students(classroom_id)


@router.get("/classes/{classroom_id}/subjects")
async def class_subjects(request: Request, classroom_id: str):
    await require_service(request)
    _, _, subjects, _ = repos(request)
    return await subjects.list_for_class(classroom_id)


@router.post("/student/{student_id}/join-class")
async def student_join_class(request: Request, student_id: str, payload: JoinClassRequest):
    await require_service(request)
    _, classrooms, _, enrollments = repos(request)
    return await EnrollmentService(classrooms, enrollments).join_class(student_id, payload.code)


@router.get("/student/{student_id}/classes")
async def student_classes(request: Request, student_id: str):
    await require_service(request)
    _, classrooms, _, enrollments = repos(request)
    return await EnrollmentService(classrooms, enrollments).list_student_classes(student_id)


@router.get("/student/{student_id}/subjects")
async def student_subjects(request: Request, student_id: str):
    await require_service(request)
    _, classrooms, subjects, enrollments = repos(request)
    classes = await EnrollmentService(classrooms, enrollments).list_student_classes(student_id)
    result = []
    for classroom in classes:
        result.extend(await subjects.list_for_class(classroom.id))
    return result


@router.get("/enrollments/check")
async def enrollment_check(request: Request, student_id: str, classroom_id: str):
    await require_service(request)
    _, _, _, enrollments = repos(request)
    return {"enrolled": await enrollments.check(student_id, classroom_id)}
