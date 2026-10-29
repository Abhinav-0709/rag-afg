from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the subject, e.g. Data Structures")
    code: Optional[str] = Field(None, max_length=20, description="Course code, e.g. CS201")
    description: Optional[str] = Field(None, max_length=500, description="Brief description or course objective")
    semester: Optional[str] = Field(None, max_length=50, description="Semester or academic term")


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field(None, max_length=500)
    semester: Optional[str] = Field(None, max_length=50)


class SubjectResponse(SubjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    unit_count: int = 0
    resource_count: int = 0

    model_config = ConfigDict(from_attributes=True)
