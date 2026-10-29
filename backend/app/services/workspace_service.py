from typing import Optional
from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.models.unit import SyllabusUnitCreate, SyllabusUnitResponse
from app.models.resource import ResourceCreate, ResourceUpdate, ResourceResponse, SourceType
from app.repositories.base import WorkspaceRepository


class WorkspaceService:
    def __init__(self, repo: WorkspaceRepository):
        self.repo = repo

    async def list_subjects(self) -> list[SubjectResponse]:
        return await self.repo.list_subjects()

    async def get_subject(self, subject_id: str) -> Optional[SubjectResponse]:
        return await self.repo.get_subject(subject_id)

    async def create_subject(self, data: SubjectCreate) -> SubjectResponse:
        return await self.repo.create_subject(data)

    async def update_subject(self, subject_id: str, data: SubjectUpdate) -> Optional[SubjectResponse]:
        return await self.repo.update_subject(subject_id, data)

    async def delete_subject(self, subject_id: str) -> bool:
        return await self.repo.delete_subject(subject_id)

    async def create_unit(self, subject_id: str, data: SyllabusUnitCreate) -> SyllabusUnitResponse:
        subject = await self.repo.get_subject(subject_id)
        if not subject:
            raise ValueError(f"Subject with id '{subject_id}' does not exist.")
        return await self.repo.create_unit(subject_id, data)

    async def list_units(self, subject_id: str) -> list[SyllabusUnitResponse]:
        subject = await self.repo.get_subject(subject_id)
        if not subject:
            raise ValueError(f"Subject with id '{subject_id}' does not exist.")
        return await self.repo.list_units(subject_id)

    async def delete_unit(self, unit_id: str) -> bool:
        return await self.repo.delete_unit(unit_id)

    async def create_resource(self, data: ResourceCreate) -> ResourceResponse:
        subject = await self.repo.get_subject(data.subject_id)
        if not subject:
            raise ValueError(f"Subject with id '{data.subject_id}' does not exist.")
        return await self.repo.create_resource(data)

    async def get_resource(self, resource_id: str) -> Optional[ResourceResponse]:
        return await self.repo.get_resource(resource_id)

    async def list_resources(
        self,
        subject_id: Optional[str] = None,
        unit_id: Optional[str] = None,
        source_type: Optional[SourceType] = None,
    ) -> list[ResourceResponse]:
        return await self.repo.list_resources(subject_id=subject_id, unit_id=unit_id, source_type=source_type)

    async def update_resource(self, resource_id: str, data: ResourceUpdate) -> Optional[ResourceResponse]:
        return await self.repo.update_resource(resource_id, data)

    async def delete_resource(self, resource_id: str) -> bool:
        return await self.repo.delete_resource(resource_id)

