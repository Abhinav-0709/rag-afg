from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from app.api.deps import get_workspace_service
from app.models.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    SourceType,
    DocumentPagesListResponse,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter(tags=["Academic Resources"])


@router.get("/resources", response_model=list[ResourceResponse])
async def list_resources(
    subject_id: Optional[str] = Query(None, description="Filter resources by subject ID"),
    unit_id: Optional[str] = Query(None, description="Filter resources by syllabus unit ID"),
    source_type: Optional[SourceType] = Query(None, description="Filter by source type"),
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.list_resources(
        subject_id=subject_id, unit_id=unit_id, source_type=source_type
    )


@router.post("/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        return await service.create_resource(payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/subjects/{subject_id}/upload",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_academic_file(
    subject_id: str,
    file: UploadFile = File(..., description="Academic document (PDF, DOCX, TXT, PNG, JPG)"),
    title: str = Form(..., min_length=1, max_length=200, description="Title for the resource"),
    source_type: SourceType = Form(SourceType.NOTES, description="Category of academic resource"),
    unit_id: Optional[str] = Form(None, description="Optional associated syllabus unit"),
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        file_bytes = await file.read()
        file_name = file.filename or "uploaded_document"
        return await service.process_and_store_file(
            subject_id=subject_id,
            title=title,
            source_type=source_type,
            file_name=file_name,
            file_bytes=file_bytes,
            unit_id=unit_id if unit_id else None,
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/resources/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    resource = await service.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.get("/resources/{resource_id}/pages", response_model=DocumentPagesListResponse)
async def get_resource_pages(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        return await service.get_document_pages(resource_id)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get("/resources/{resource_id}/download")
async def download_resource_file(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    file_path = await service.get_resource_file_path(resource_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original file not found")
    resource = await service.get_resource(resource_id)
    filename = resource.file_name if resource else file_path.name
    return FileResponse(path=file_path, filename=filename)


@router.patch("/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    resource = await service.update_resource(resource_id, payload)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    success = await service.delete_resource(resource_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


