from fastapi import APIRouter
from app.api.subjects import router as subjects_router
from app.api.units import router as units_router
from app.api.resources import router as resources_router

api_router = APIRouter()
api_router.include_router(subjects_router)
api_router.include_router(units_router)
api_router.include_router(resources_router)

__all__ = ["api_router"]

