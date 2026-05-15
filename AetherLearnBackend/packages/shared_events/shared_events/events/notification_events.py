from pydantic import BaseModel


class ExportRequested(BaseModel):
    export_id: str
    user_id: str


class ExportCompleted(BaseModel):
    export_id: str
    user_id: str


class ExportFailed(BaseModel):
    export_id: str
    reason: str


class KvPackCreated(BaseModel):
    lesson_id: str
    export_id: str


class KvPackImported(BaseModel):
    lesson_id: str
    user_id: str


class NotificationCreated(BaseModel):
    notification_id: str
    user_id: str
