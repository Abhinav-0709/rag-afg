from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_workspace_service
from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.get("", response_model=list[SubjectResponse])
async def list_subjects(service: WorkspaceService = Depends(get_workspace_service)):
    return await service.list_subjects()


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: SubjectCreate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    return await service.create_subject(payload)


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    subject = await service.get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.patch("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    payload: SubjectUpdate,
    service: WorkspaceService = Depends(get_workspace_service),
):
    subject = await service.update_subject(subject_id, payload)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    service: WorkspaceService = Depends(get_workspace_service),
):
    success = await service.delete_subject(subject_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

