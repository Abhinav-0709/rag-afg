from typing import List, Optional
from datetime import datetime, timezone
from app.config import settings
from app.models.rag import (
    AnswerMode,
    AnswerFormat,
    RAGQueryRequest,
    RAGQueryResponse,
    RetrievedCitation,
)
from app.repositories.base import WorkspaceRepository
from app.services.retrieval_service import HybridRetrievalService
from app.services.ai_providers import get_llm_provider


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
        citations: List[RetrievedCitation] = await self.retrieval_service.retrieve(
            subject_id=request.subject_id,
            query=request.query,
            unit_id=request.unit_id,
            source_types=request.source_types,
            top_k=settings.TOP_K_RETRIEVAL,
        )

        # 3. Handle insufficient evidence in source_only mode
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

        # 4. Construct prompt with retrieved passages
        context_blocks = []
        for i, c in enumerate(citations, 1):
            context_blocks.append(
                f"[Source {i}: {c.document_title} (Page {c.page_number})]\n{c.excerpt}"
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

        user_prompt = (
            f"=== RETRIEVED ACADEMIC CONTEXT ===\n"
            f"{context_str}\n"
            f"=== END CONTEXT ===\n\n"
            f"Student Question: {request.query}\n"
            f"Mode: {request.mode.value}\n"
            f"Format: {request.answer_format.value}\n"
            f"Subject: {subject.name}"
        )

        # 5. Generate grounded answer via LLM
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

        return RAGQueryResponse(
            answer=answer_text,
            grounded=is_grounded,
            mode_used=request.mode,
            format_used=request.answer_format,
            citations=citations,
            retrieved_count=len(citations),
            disclaimer=disclaimer,
            timestamp=datetime.now(timezone.utc),
        )
