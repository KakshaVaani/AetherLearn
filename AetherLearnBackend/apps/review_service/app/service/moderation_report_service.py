class ModerationReportService:
    def __init__(self, repo):
        self.repo = repo

    async def reports(self):
        return await self.repo.list_open()

    async def resolve(self, report_id: str, reviewer_id: str):
        return await self.repo.update(report_id, {"status": "resolved", "resolvedBy": reviewer_id})
