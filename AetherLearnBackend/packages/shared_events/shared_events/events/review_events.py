from pydantic import BaseModel


class ReportResolved(BaseModel):
    report_id: str
    reviewer_id: str
