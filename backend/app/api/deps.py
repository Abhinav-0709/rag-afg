from fastapi import Depends
from app.config import settings
from app.repositories.base import WorkspaceRepository
from app.repositories.sqlite import SQLiteWorkspaceRepository
from app.services.workspace_service import WorkspaceService
from app.services.rag_service import AcademicRAGService

# Singleton repository instance for local development
_sqlite_repo: SQLiteWorkspaceRepository | None = None


def get_repository() -> WorkspaceRepository:
    global _sqlite_repo
    if _sqlite_repo is None:
        _sqlite_repo = SQLiteWorkspaceRepository(settings.sqlite_db_path)
    return _sqlite_repo


def get_workspace_service(
    repo: WorkspaceRepository = Depends(get_repository),
) -> WorkspaceService:
    return WorkspaceService(repo)


def get_rag_service(
    repo: WorkspaceRepository = Depends(get_repository),
) -> AcademicRAGService:
    return AcademicRAGService(repo)

