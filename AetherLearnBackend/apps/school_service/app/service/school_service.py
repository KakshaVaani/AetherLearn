from __future__ import annotations

from shared_schemas import CreateSchoolRequest, School
from shared_utils.errors import NotFoundError

from ..repository.school_repository import SchoolRepository


class SchoolService:
    def __init__(self, schools: SchoolRepository) -> None:
        self.schools = schools

    async def create_school(self, payload: CreateSchoolRequest, actor_id: str) -> School:
        item = await self.schools.create(
            payload.model_dump(by_alias=True) | {"adminIds": [actor_id]}
        )
        return School.model_validate(item)

    async def get_school(self, school_id: str) -> School:
        item = await self.schools.get(school_id)
        if not item:
            raise NotFoundError("School not found")
        return School.model_validate(item)
