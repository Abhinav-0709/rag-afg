from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.resource import SourceType


class AnswerMode(str, Enum):
    SOURCE_ONLY = "source_only"
    COMBINE_SOURCES = "combine_sources"
    GENERAL = "general"


class AnswerFormat(str, Enum):
    DETAILED = "detailed"
    SHORT = "short"
    TWO_MARK = "2_mark"
    FIVE_MARK = "5_mark"
    TEN_MARK = "10_mark"
    STEP_BY_STEP = "step_by_step"


class RetrievedCitation(BaseModel):
    chunk_id: str
    resource_id: str
    document_title: str
    file_name: str
    source_type: SourceType
    unit_id: Optional[str] = None
    page_number: int
    excerpt: str
    score: float
    verified: bool = True

    model_config = ConfigDict(from_attributes=True)


class CitationVerificationRequest(BaseModel):
    subject_id: str = Field(..., description="Subject workspace ID")
    resource_id: str = Field(..., description="Academic resource ID")
    chunk_id: str = Field(..., description="Chunk ID")
    page_number: int = Field(..., description="Page number referenced in citation")


class CitationVerificationResult(BaseModel):
    valid: bool
    subject_match: bool
    resource_exists: bool
    page_exists: bool
    resource_title: Optional[str] = None
    file_name: Optional[str] = None
    source_type: Optional[SourceType] = None
    page_number: Optional[int] = None
    page_char_count: Optional[int] = None
    surrounding_context: Optional[str] = None
    message: str

    model_config = ConfigDict(from_attributes=True)


class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000, description="Question asked by the student")
    subject_id: str = Field(..., description="Subject workspace ID to isolate retrieval")
    unit_id: Optional[str] = Field(None, description="Optional syllabus unit to constrain retrieval")
    mode: AnswerMode = Field(AnswerMode.SOURCE_ONLY, description="Grounded source mode")
    answer_format: AnswerFormat = Field(AnswerFormat.DETAILED, description="Academic answer format")
    source_types: Optional[List[SourceType]] = Field(None, description="Optional filter by document categories")


class RAGQueryResponse(BaseModel):
    answer: str
    grounded: bool
    mode_used: AnswerMode
    format_used: AnswerFormat
    citations: List[RetrievedCitation]
    retrieved_count: int
    disclaimer: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)

