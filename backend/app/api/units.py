from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_workspace_service
from app.models.unit import SyllabusUnitCreate, SyllabusUnitResponse
from app.services.workspace_service import WorkspaceService

router = APIRouter(tags=["Syllabus Units"])


@router.get("/subjects/{subject_id}/units", response_model=list[SyllabusUnitResponse])
async def list_units(
    subject_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        return await service.list_units(subject_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/subjects/{subject_id}/units",
    response_model=SyllabusUnitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_unit(
    subject_id: str,
    payload: SyllabusUnitCreate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    try:
        return await service.create_unit(subject_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    success = await service.delete_unit(unit_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus unit not found")

