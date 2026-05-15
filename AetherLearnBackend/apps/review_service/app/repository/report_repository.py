from typing import Any


class ReportRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def list_open(self) -> list[dict]:
        return await self.repo.list(status="open")

    async def update(self, report_id: str, data: dict) -> dict | None:
        return await self.repo.update(report_id, data)
