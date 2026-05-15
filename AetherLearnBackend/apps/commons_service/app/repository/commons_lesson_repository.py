from typing import Any


class CommonsLessonRepository:
    def __init__(self, repo: Any) -> None:
        self.repo = repo

    async def publish(self, data: dict) -> dict:
        existing = await self.repo.find_one(lessonId=data["lessonId"])
        return (
            await self.repo.update(existing["id"], data)
            if existing
            else await self.repo.insert(data)
        )

    async def get_by_lesson_id(self, lesson_id: str) -> dict | None:
        return await self.repo.find_one(lessonId=lesson_id)

    async def search(self, filters: dict) -> list[dict]:
        rows = await self.repo.list()
        query = (filters.get("q") or "").lower()
        result = []
        for row in rows:
            if (
                query
                and query
                not in f"{row.get('title', '')} {row.get('subject', '')} {row.get('searchText', '')}".lower()
            ):
                continue
            if filters.get("subject") and row.get("subject") != filters["subject"]:
                continue
            if filters.get("language") and row.get("language") != filters["language"]:
                continue
            result.append(row)
        return result[: int(filters.get("limit") or 20)]
