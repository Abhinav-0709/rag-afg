from abc import ABC, abstractmethod
from typing import Optional
from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.models.unit import SyllabusUnitCreate, SyllabusUnitResponse
from app.models.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    SourceType,
    DocumentPageResponse,
)


class WorkspaceRepository(ABC):
    @abstractmethod
    async def init_db(self) -> None:
        pass

    @abstractmethod
    async def create_subject(self, data: SubjectCreate) -> SubjectResponse:
        pass

    @abstractmethod
    async def get_subject(self, subject_id: str) -> Optional[SubjectResponse]:
        pass

    @abstractmethod
    async def list_subjects(self) -> list[SubjectResponse]:
        pass

    @abstractmethod
    async def update_subject(self, subject_id: str, data: SubjectUpdate) -> Optional[SubjectResponse]:
        pass

    @abstractmethod
    async def delete_subject(self, subject_id: str) -> bool:
        pass

    @abstractmethod
    async def create_unit(self, subject_id: str, data: SyllabusUnitCreate) -> SyllabusUnitResponse:
        pass

    @abstractmethod
    async def list_units(self, subject_id: str) -> list[SyllabusUnitResponse]:
        pass

    @abstractmethod
    async def delete_unit(self, unit_id: str) -> bool:
        pass

    @abstractmethod
    async def create_resource(self, data: ResourceCreate) -> ResourceResponse:
        pass

    @abstractmethod
    async def get_resource(self, resource_id: str) -> Optional[ResourceResponse]:
        pass

    @abstractmethod
    async def list_resources(
        self,
        subject_id: Optional[str] = None,
        unit_id: Optional[str] = None,
        source_type: Optional[SourceType] = None,
    ) -> list[ResourceResponse]:
        pass

    @abstractmethod
    async def update_resource(
        self,
        resource_id: str,
        data: ResourceUpdate,
        page_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[ResourceResponse]:
        pass

    @abstractmethod
    async def delete_resource(self, resource_id: str) -> bool:
        pass

    @abstractmethod
    async def save_document_pages(
        self, resource_id: str, pages: list[dict]
    ) -> None:
        pass

    @abstractmethod
    async def get_document_pages(
        self, resource_id: str
    ) -> list[DocumentPageResponse]:
        pass

    @abstractmethod
    async def save_document_chunks(
        self, chunks: list[dict]
    ) -> None:
        pass

    @abstractmethod
    async def get_candidate_chunks(
        self,
        subject_id: str,
        unit_id: Optional[str] = None,
        source_types: Optional[list[str]] = None,
    ) -> list[dict]:
        pass



