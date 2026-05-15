from pydantic import BaseModel


class StudentQuestionAsked(BaseModel):
    lesson_id: str
    student_id: str
    question: str


class StudentQuestionAnswered(BaseModel):
    lesson_id: str
    student_id: str
    answer: str


class CommonsAutoCheckCompleted(BaseModel):
    lesson_id: str
    status: str
