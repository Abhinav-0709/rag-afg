from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SyllabusUnitBase(BaseModel):
    unit_number: int = Field(..., ge=1, le=50, description="Unit number, e.g. 1, 2, 3")
    title: str = Field(..., min_length=1, max_length=150, description="Title of the syllabus unit")
    description: Optional[str] = Field(None, max_length=1000, description="Topics covered in this unit")


class SyllabusUnitCreate(SyllabusUnitBase):
    pass


class SyllabusUnitUpdate(BaseModel):
    unit_number: Optional[int] = Field(None, ge=1, le=50)
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)


class SyllabusUnitResponse(SyllabusUnitBase):
    id: str
    subject_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
