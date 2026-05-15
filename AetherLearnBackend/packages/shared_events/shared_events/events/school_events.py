from pydantic import BaseModel


class SchoolCreated(BaseModel):
    school_id: str


class ClassroomCreated(BaseModel):
    classroom_id: str
    teacher_id: str


class ClassSubjectCreated(BaseModel):
    class_subject_id: str
    teacher_id: str


class StudentEnrolled(BaseModel):
    classroom_id: str
    student_id: str


class StudentRemoved(BaseModel):
    classroom_id: str
    student_id: str


class JoinCodeCreated(BaseModel):
    classroom_id: str
    code: str
