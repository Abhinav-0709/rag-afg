from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_workspace_service
from app.models.resource import ResourceCreate, ResourceUpdate, ResourceResponse, SourceType
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/resources", tags=["Academic Resources"])


@router.get("", response_model=list[ResourceResponse])
async def list_resources(
    subject_id: Optional[str] = Query(None, description="Filter resources by subject ID"),
    unit_id: Optional[str] = Query(None, description="Filter resources by syllabus unit ID"),
    source_type: Optional[SourceType] = Query(None, description="Filter by source type"),
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.list_resources(
        subject_id=subject_id, unit_id=unit_id, source_type=source_type
    )


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        return await service.create_resource(payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    resource = await service.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    resource = await service.update_resource(resource_id, payload)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    success = await service.delete_resource(resource_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

