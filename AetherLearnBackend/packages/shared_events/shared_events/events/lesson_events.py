from pydantic import BaseModel


class LessonDraftCreated(BaseModel):
    lesson_id: str
    teacher_id: str


class LessonGenerationRequested(BaseModel):
    lesson_id: str
    generation_id: str
    teacher_id: str


class LessonGenerationCompleted(BaseModel):
    lesson_id: str
    generation_id: str


class LessonGenerationFailed(BaseModel):
    lesson_id: str
    generation_id: str
    reason: str


class LessonUpdated(BaseModel):
    lesson_id: str


class LessonSharedToSchool(BaseModel):
    lesson_id: str
    school_id: str


class LessonSubmittedToCommons(BaseModel):
    lesson_id: str


class LessonPublished(BaseModel):
    lesson_id: str


class LessonArchived(BaseModel):
    lesson_id: str
