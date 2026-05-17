from __future__ import annotations

from shared_schemas import CreateSchoolRequest, School
from shared_utils.errors import NotFoundError

from ..repository.school_repository import SchoolRepository


def normalize_school_name(value: str) -> str:
    return " ".join(value.strip().lower().split())


class SchoolService:
    def __init__(self, schools: SchoolRepository) -> None:
        self.schools = schools

    async def create_school(self, payload: CreateSchoolRequest, actor_id: str) -> School:
        normalized_name = normalize_school_name(payload.name)
        existing = await self.schools.find_by_normalized_name(normalized_name)
        if not existing:
            for school in await self.schools.list():
                if normalize_school_name(school.get("name", "")) == normalized_name:
                    existing = school
                    break
        if existing:
            admin_ids = list(dict.fromkeys([*existing.get("adminIds", []), actor_id]))
            patch = {"adminIds": admin_ids, "nameNormalized": normalized_name}
            if admin_ids != existing.get("adminIds", []) or existing.get("nameNormalized") != normalized_name:
                updated = await self.schools.update(existing["id"], patch)
                return School.model_validate(updated)
            return School.model_validate(existing)
        item = await self.schools.create(
            payload.model_dump(by_alias=True)
            | {"adminIds": [actor_id], "nameNormalized": normalized_name}
        )
        return School.model_validate(item)

    async def get_school(self, school_id: str) -> School:
        item = await self.schools.get(school_id)
        if not item:
            raise NotFoundError("School not found")
        return School.model_validate(item)

    async def list_schools(self, query: str | None = None) -> list[School]:
        normalized_query = normalize_school_name(query or "")
        schools = await self.schools.list()
        if normalized_query:
            schools = [
                school
                for school in schools
                if normalized_query in normalize_school_name(school.get("name", ""))
            ]
        schools.sort(key=lambda item: item.get("name", "").lower())
        return [School.model_validate(item) for item in schools[:20]]
