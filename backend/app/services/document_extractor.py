import io
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from pypdf import PdfReader
from docx import Document
from PIL import Image

from app.models.resource import ProcessingStatus


class ExtractedPage(BaseModel):
    page_number: int
    content: str
    char_count: int


class ExtractionResult(BaseModel):
    pages: List[ExtractedPage]
    page_count: int
    status: ProcessingStatus
    error_message: Optional[str] = None


class DocumentExtractor:
    @staticmethod
    def extract_from_file(file_path: Path, file_type: str) -> ExtractionResult:
        if not file_path.exists():
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message="Uploaded file does not exist on disk.",
            )

        file_size = file_path.stat().st_size
        if file_size == 0:
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message="File is empty (0 bytes). Extraction rejected.",
            )

        norm_type = file_type.lower().lstrip(".")

        try:
            if norm_type == "pdf":
                return DocumentExtractor._extract_pdf(file_path)
            elif norm_type in ("docx", "doc"):
                return DocumentExtractor._extract_docx(file_path)
            elif norm_type == "txt":
                return DocumentExtractor._extract_txt(file_path)
            elif norm_type in ("png", "jpg", "jpeg"):
                return DocumentExtractor._extract_image(file_path)
            else:
                return ExtractionResult(
                    pages=[],
                    page_count=0,
                    status=ProcessingStatus.FAILED,
                    error_message=f"Unsupported file format: {file_type}.",
                )
        except Exception as exc:
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message=f"Extraction failure: {str(exc)}",
            )

    @staticmethod
    def _extract_pdf(file_path: Path) -> ExtractionResult:
        reader = PdfReader(str(file_path))
        num_pages = len(reader.pages)
        if num_pages == 0:
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message="PDF contains 0 pages.",
            )

        pages: List[ExtractedPage] = []
        total_text_len = 0

        for idx, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            total_text_len += len(text)
            pages.append(
                ExtractedPage(
                    page_number=idx,
                    content=text,
                    char_count=len(text),
                )
            )

        # Scanned PDF check: if multi-page but almost no text
        if total_text_len < 30 and num_pages >= 1:
            return ExtractionResult(
                pages=pages,
                page_count=num_pages,
                status=ProcessingStatus.READY,
                error_message="Warning: Scanned or image-only PDF detected. Extracted text is sparse; OCR or vision required for deeper indexing.",
            )

        return ExtractionResult(
            pages=pages,
            page_count=num_pages,
            status=ProcessingStatus.READY,
            error_message=None,
        )

    @staticmethod
    def _extract_docx(file_path: Path) -> ExtractionResult:
        doc = Document(str(file_path))
        lines: List[str] = []

        for p in doc.paragraphs:
            txt = p.text.strip()
            if txt:
                lines.append(txt)

        for table in doc.tables:
            for row in table.rows:
                row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_txt:
                    lines.append(f"| {row_txt} |")

        full_text = "\n\n".join(lines).strip()
        if not full_text:
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message="DOCX document contains no readable text.",
            )

        # Chunk DOCX into logical page sections (approx 2000 chars per section)
        chunk_size = 2000
        pages: List[ExtractedPage] = []
        parts = [full_text[i : i + chunk_size] for i in range(0, len(full_text), chunk_size)]

        for idx, part in enumerate(parts, start=1):
            pages.append(
                ExtractedPage(
                    page_number=idx,
                    content=part.strip(),
                    char_count=len(part.strip()),
                )
            )

        return ExtractionResult(
            pages=pages,
            page_count=len(pages),
            status=ProcessingStatus.READY,
            error_message=None,
        )

    @staticmethod
    def _extract_txt(file_path: Path) -> ExtractionResult:
        content = ""
        for encoding in ("utf-8", "latin-1", "cp1252"):
            try:
                content = file_path.read_text(encoding=encoding)
                break
            except UnicodeDecodeError:
                continue

        content = content.strip()
        if not content:
            return ExtractionResult(
                pages=[],
                page_count=0,
                status=ProcessingStatus.FAILED,
                error_message="Text document is empty.",
            )

        chunk_size = 2000
        parts = [content[i : i + chunk_size] for i in range(0, len(content), chunk_size)]
        pages: List[ExtractedPage] = []

        for idx, part in enumerate(parts, start=1):
            pages.append(
                ExtractedPage(
                    page_number=idx,
                    content=part.strip(),
                    char_count=len(part.strip()),
                )
            )

        return ExtractionResult(
            pages=pages,
            page_count=len(pages),
            status=ProcessingStatus.READY,
            error_message=None,
        )

    @staticmethod
    def _extract_image(file_path: Path) -> ExtractionResult:
        with Image.open(str(file_path)) as img:
            width, height = img.size
            format_name = img.format or "IMAGE"

        # Check for tesseract
        ocr_text = ""
        ocr_warning = None
        try:
            import pytesseract  # type: ignore

            ocr_text = pytesseract.image_to_string(Image.open(str(file_path))).strip()
        except Exception:
            ocr_warning = (
                f"Image stored ({format_name} {width}x{height}px). "
                "Tesseract OCR is not active on host; image preserved for visual inspection and navigation."
            )

        content = (
            ocr_text
            if ocr_text
            else f"[Image Source: {file_path.name} ({width}x{height} {format_name})]"
        )

        return ExtractionResult(
            pages=[
                ExtractedPage(
                    page_number=1,
                    content=content,
                    char_count=len(content),
                )
            ],
            page_count=1,
            status=ProcessingStatus.READY,
            error_message=ocr_warning,
        )

