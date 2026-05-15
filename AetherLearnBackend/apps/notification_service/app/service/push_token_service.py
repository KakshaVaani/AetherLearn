class PushTokenService:
    def __init__(self, repo):
        self.repo = repo

    async def create(self, data: dict):
        return await self.repo.create(data)
