from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SourceType(str, Enum):
    SYLLABUS = "syllabus"
    TEXTBOOK = "textbook"
    NOTES = "notes"
    QUESTION_PAPER = "question_paper"
    OTHER = "other"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ResourceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Display title for the resource")
    source_type: SourceType = Field(SourceType.NOTES, description="Category of academic material")
    file_name: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_type: str = Field(..., min_length=1, max_length=50, description="Extension/MIME, e.g. pdf, docx, txt")
    file_size_bytes: int = Field(default=0, ge=0)
    unit_id: Optional[str] = Field(None, description="Optional associated syllabus unit ID")


class ResourceCreate(ResourceBase):
    subject_id: str
    storage_path: Optional[str] = Field(None, description="Relative path in storage engine")


class ResourceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    source_type: Optional[SourceType] = None
    unit_id: Optional[str] = None
    status: Optional[ProcessingStatus] = None
    storage_path: Optional[str] = None


class ResourceResponse(ResourceBase):
    id: str
    subject_id: str
    storage_path: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.READY
    page_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPageResponse(BaseModel):
    id: str
    resource_id: str
    page_number: int
    content: str
    char_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPagesListResponse(BaseModel):
    resource_id: str
    title: str
    file_name: str
    page_count: int
    status: ProcessingStatus
    error_message: Optional[str] = None
    pages: list[DocumentPageResponse]

