from pathlib import Path
from typing import Optional
from app.config import settings
from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.models.unit import SyllabusUnitCreate, SyllabusUnitResponse
from app.models.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    SourceType,
    ProcessingStatus,
    DocumentPagesListResponse,
)
from app.repositories.base import WorkspaceRepository
from app.services.document_extractor import DocumentExtractor


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
        # Also clean up subject uploads folder
        subject_dir = settings.upload_dir_path / subject_id
        if subject_dir.exists():
            import shutil

            shutil.rmtree(subject_dir, ignore_errors=True)
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

    async def update_resource(
        self,
        resource_id: str,
        data: ResourceUpdate,
        page_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[ResourceResponse]:
        return await self.repo.update_resource(
            resource_id, data, page_count=page_count, error_message=error_message
        )

    async def delete_resource(self, resource_id: str) -> bool:
        resource = await self.repo.get_resource(resource_id)
        if resource and resource.storage_path:
            file_path = settings.DATA_DIR / resource.storage_path
            if file_path.exists():
                file_path.unlink(missing_ok=True)
        return await self.repo.delete_resource(resource_id)

    async def process_and_store_file(
        self,
        subject_id: str,
        title: str,
        source_type: SourceType,
        file_name: str,
        file_bytes: bytes,
        unit_id: Optional[str] = None,
    ) -> ResourceResponse:
        subject = await self.repo.get_subject(subject_id)
        if not subject:
            raise ValueError(f"Subject with id '{subject_id}' does not exist.")

        if unit_id:
            units = await self.repo.list_units(subject_id)
            if not any(u.id == unit_id for u in units):
                raise ValueError(f"Unit with id '{unit_id}' does not belong to this subject.")

        file_ext = file_name.split(".")[-1].lower() if "." in file_name else "txt"
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"File format '{file_ext}' is not supported. Allowed formats: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
            )

        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise ValueError(f"File size exceeds limit of {max_mb}MB.")

        # 1. Create initial resource record in PENDING / UPLOADED status
        initial_record = await self.repo.create_resource(
            ResourceCreate(
                subject_id=subject_id,
                unit_id=unit_id,
                title=title,
                source_type=source_type,
                file_name=file_name,
                file_type=file_ext,
                file_size_bytes=len(file_bytes),
                storage_path=None,
            )
        )

        # 2. Store original file to isolated subject directory
        subject_upload_dir = settings.upload_dir_path / subject_id
        subject_upload_dir.mkdir(parents=True, exist_ok=True)
        disk_filename = f"{initial_record.id}_{file_name}"
        stored_file_path = subject_upload_dir / disk_filename
        stored_file_path.write_bytes(file_bytes)

        relative_storage_path = str(Path(settings.UPLOAD_DIR_NAME) / subject_id / disk_filename)

        # 3. Extract content and metadata
        extraction = DocumentExtractor.extract_from_file(stored_file_path, file_ext)

        # 4. Save extracted pages if any
        if extraction.pages:
            await self.repo.save_document_pages(
                initial_record.id,
                [p.model_dump() for p in extraction.pages],
            )

        # 5. Update resource record with status, storage path, page count, and warnings
        updated = await self.repo.update_resource(
            initial_record.id,
            ResourceUpdate(
                title=title,
                source_type=source_type,
                unit_id=unit_id,
                status=extraction.status,
                storage_path=relative_storage_path,
            ),
            page_count=extraction.page_count,
            error_message=extraction.error_message,
        )

        return updated or initial_record

    async def get_document_pages(self, resource_id: str) -> DocumentPagesListResponse:
        resource = await self.repo.get_resource(resource_id)
        if not resource:
            raise ValueError("Resource not found")

        pages = await self.repo.get_document_pages(resource_id)
        return DocumentPagesListResponse(
            resource_id=resource.id,
            title=resource.title,
            file_name=resource.file_name,
            page_count=resource.page_count,
            status=resource.status,
            error_message=resource.error_message,
            pages=pages,
        )

    async def get_resource_file_path(self, resource_id: str) -> Optional[Path]:
        resource = await self.repo.get_resource(resource_id)
        if not resource or not resource.storage_path:
            return None
        file_path = settings.DATA_DIR / resource.storage_path
        if file_path.exists():
            return file_path
        return None


