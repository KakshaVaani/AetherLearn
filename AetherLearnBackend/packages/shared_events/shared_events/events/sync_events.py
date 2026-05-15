from pydantic import BaseModel


class SyncOperationReceived(BaseModel):
    operation_id: str
    user_id: str


class SyncOperationProcessed(BaseModel):
    operation_id: str
    user_id: str


class SyncConflictDetected(BaseModel):
    operation_id: str
    code: str


class HubSyncCompleted(BaseModel):
    hub_id: str
