from shared_schemas import CommonsCollection


class CollectionService:
    def __init__(self, repo):
        self.repo = repo

    async def list(self):
        return [CommonsCollection.model_validate(item) for item in await self.repo.list()]

    async def get(self, collection_id: str):
        item = await self.repo.get(collection_id)
        return CommonsCollection.model_validate(item) if item else None
