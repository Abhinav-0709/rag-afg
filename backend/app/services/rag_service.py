import re
from typing import List, Optional
from datetime import datetime, timezone
from app.config import settings
from app.models.rag import (
    AnswerMode,
    AnswerFormat,
    RAGQueryRequest,
    RAGQueryResponse,
    RetrievedCitation,
    CitationVerificationRequest,
    CitationVerificationResult,
)
from app.repositories.base import WorkspaceRepository
from app.services.retrieval_service import HybridRetrievalService
from app.services.ai_providers import get_llm_provider
from app.services.mermaid_service import MermaidService


class AcademicRAGService:
    def __init__(self, repo: WorkspaceRepository):
        self.repo = repo
        self.retrieval_service = HybridRetrievalService(repo)
        self.llm_provider = get_llm_provider()

    async def answer_question(self, request: RAGQueryRequest) -> RAGQueryResponse:
        # 1. Subject validation
        subject = await self.repo.get_subject(request.subject_id)
        if not subject:
            raise ValueError(f"Subject workspace with id '{request.subject_id}' does not exist.")

        # 2. Retrieve relevant context passages
        raw_citations: List[RetrievedCitation] = await self.retrieval_service.retrieve(
            subject_id=request.subject_id,
            query=request.query,
            unit_id=request.unit_id,
            source_types=request.source_types,
            top_k=settings.TOP_K_RETRIEVAL,
        )

        # 3. Citation integrity validation: strictly ensure each citation references a real resource & valid page
        citations: List[RetrievedCitation] = []
        for c in raw_citations:
            res = await self.repo.get_resource(c.resource_id)
            if res and res.subject_id == request.subject_id:
                # Validate page presence
                pages = await self.repo.get_document_pages(c.resource_id)
                page_exists = any(p.page_number == c.page_number for p in pages)
                if page_exists or not pages:
                    c.verified = True
                    citations.append(c)

        # 4. Handle insufficient evidence in source_only mode
        if not citations and request.mode == AnswerMode.SOURCE_ONLY:
            return RAGQueryResponse(
                answer=(
                    f"The uploaded materials for **{subject.name}** do not contain sufficient information "
                    "to answer this question. Please upload relevant textbooks, notes, or syllabus units "
                    "for this topic."
                ),
                grounded=False,
                mode_used=request.mode,
                format_used=request.answer_format,
                citations=[],
                retrieved_count=0,
                disclaimer="Zero relevant passages found in the uploaded documents for this subject.",
                timestamp=datetime.now(timezone.utc),
            )

        # 5. Construct prompt with retrieved passages
        context_blocks = []
        for i, c in enumerate(citations, 1):
            page_label = f"Page {c.page_number}" if c.page_number > 0 else "Full Document"
            context_blocks.append(
                f"[Source {i}: {c.document_title} ({page_label})]\n{c.excerpt}"
            )

        # 5. Check visual explanation intent
        wants_diagram, diagram_type = MermaidService.detect_diagram_intent(
            query=request.query,
            answer_format=request.answer_format,
            explicit_request=request.include_diagram,
        )

        context_str = "\n\n".join(context_blocks) if context_blocks else "NO_CONTEXT_FOUND"

        system_prompt = (
            "You are AFG, an academic knowledge assistant. Your goal is to help students learn and "
            "prepare for exams using their own uploaded resources. "
            "Rules:\n"
            "1. In source-grounded mode, answer using ONLY the retrieved academic context.\n"
            "2. Never hallucinate or manufacture facts, formulas, or citations not present in the context.\n"
            "3. If the context is insufficient or missing, state honestly that the uploaded materials "
            "do not contain enough evidence.\n"
            "4. Structure answers according to the requested format (detailed, short, marks-based, or step-by-step)."
        )

        if wants_diagram:
            system_prompt += (
                f"\n5. The student requested or would benefit from a visual diagram. At the end of your response, "
                f"provide a valid Mermaid diagram ({diagram_type}) enclosed in ```mermaid ... ``` code fences."
            )

        user_prompt = (
            f"=== RETRIEVED ACADEMIC CONTEXT ===\n"
            f"{context_str}\n"
            f"=== END CONTEXT ===\n\n"
            f"Student Question: {request.query}\n"
            f"Mode: {request.mode.value}\n"
            f"Format: {request.answer_format.value}\n"
            f"Subject: {subject.name}"
        )

        # 6. Generate grounded answer via LLM
        answer_text = await self.llm_provider.generate_answer(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        is_grounded = len(citations) > 0 and "insufficient information" not in answer_text.lower()
        disclaimer = None
        if request.mode == AnswerMode.GENERAL:
            disclaimer = "General explanation mode used. Supplementary model knowledge included."
        elif not is_grounded:
            disclaimer = "Answer indicates insufficient source evidence in the uploaded workspace."

        # 7. Extract, validate, and sanitize Mermaid diagram if present
        has_diagram = False
        diagram_code = None
        diagram_error = None

        mermaid_match = re.search(r"```(?:mermaid)?\s*\n(.*?)\n```", answer_text, re.DOTALL)
        if mermaid_match:
            raw_diagram = mermaid_match.group(1).strip()
            is_valid, sanitized, err = MermaidService.validate_and_sanitize_mermaid(raw_diagram)
            if is_valid:
                has_diagram = True
                diagram_code = sanitized
            else:
                diagram_error = err
            # Strip mermaid block from text so the prose is cleanly formatted
            answer_text = re.sub(r"```(?:mermaid)?\s*\n.*?\n```", "", answer_text, flags=re.DOTALL).strip()
        elif wants_diagram and is_grounded:
            # Fallback diagram generation from extracted points/steps
            lines = [l.strip("- *0123456789. ") for l in answer_text.split("\n") if len(l.strip()) > 8]
            fallback_code = MermaidService.generate_fallback_diagram(lines[:5], diagram_type=diagram_type)
            if fallback_code:
                is_valid, sanitized, _ = MermaidService.validate_and_sanitize_mermaid(fallback_code)
                if is_valid:
                    has_diagram = True
                    diagram_code = sanitized

        return RAGQueryResponse(
            answer=answer_text,
            grounded=is_grounded,
            mode_used=request.mode,
            format_used=request.answer_format,
            citations=citations,
            retrieved_count=len(citations),
            has_diagram=has_diagram,
            diagram_code=diagram_code,
            diagram_type=diagram_type if has_diagram else None,
            diagram_error=diagram_error,
            disclaimer=disclaimer,
            timestamp=datetime.now(timezone.utc),
        )

    async def verify_citation(
        self,
        request: CitationVerificationRequest,
    ) -> CitationVerificationResult:
        """
        Validates citation against database ground truth.
        Verifies:
        1. Resource existence
        2. Subject isolation (matches subject_id)
        3. Real page presence in document_pages
        """
        resource = await self.repo.get_resource(request.resource_id)
        if not resource:
            return CitationVerificationResult(
                valid=False,
                subject_match=False,
                resource_exists=False,
                page_exists=False,
                message=f"Referenced academic resource '{request.resource_id}' does not exist.",
            )

        subject_match = resource.subject_id == request.subject_id
        if not subject_match:
            return CitationVerificationResult(
                valid=False,
                subject_match=False,
                resource_exists=True,
                page_exists=False,
                resource_title=resource.title,
                file_name=resource.file_name,
                source_type=resource.source_type,
                message=f"Referenced resource belongs to another subject, violating workspace isolation.",
            )

        pages = await self.repo.get_document_pages(request.resource_id)
        target_page = next((p for p in pages if p.page_number == request.page_number), None)

        if not target_page:
            # If no pages exist yet at all for this resource
            if not pages:
                return CitationVerificationResult(
                    valid=True,
                    subject_match=True,
                    resource_exists=True,
                    page_exists=False,
                    resource_title=resource.title,
                    file_name=resource.file_name,
                    source_type=resource.source_type,
                    page_number=request.page_number,
                    message="Resource verified; page extraction pending or unpaged document.",
                )

            return CitationVerificationResult(
                valid=False,
                subject_match=True,
                resource_exists=True,
                page_exists=False,
                resource_title=resource.title,
                file_name=resource.file_name,
                source_type=resource.source_type,
                page_number=request.page_number,
                message=f"Page {request.page_number} does not exist in this document (total pages: {len(pages)}).",
            )

        char_count = target_page.char_count
        content = target_page.content
        preview = content[:250].strip() + ("..." if len(content) > 250 else "")

        return CitationVerificationResult(
            valid=True,
            subject_match=True,
            resource_exists=True,
            page_exists=True,
            resource_title=resource.title,
            file_name=resource.file_name,
            source_type=resource.source_type,
            page_number=request.page_number,
            page_char_count=char_count,
            surrounding_context=preview,
            message=f"Verified citation: '{resource.title}' (Page {request.page_number}).",
        )
