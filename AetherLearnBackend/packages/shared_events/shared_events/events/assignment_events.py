from pydantic import BaseModel


class LessonAssigned(BaseModel):
    lesson_id: str
    teacher_id: str
    student_ids: list[str]


class LessonOpened(BaseModel):
    lesson_id: str
    student_id: str


class StudentProgressUpdated(BaseModel):
    lesson_id: str
    student_id: str


class LessonCompleted(BaseModel):
    lesson_id: str
    student_id: str


class LessonDownloaded(BaseModel):
    lesson_id: str
    student_id: str
