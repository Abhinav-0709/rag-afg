from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_rag_service
from app.models.rag import RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import AcademicRAGService

router = APIRouter(prefix="/rag", tags=["Academic RAG Engine"])


@router.post("/query", response_model=RAGQueryResponse)
async def query_academic_rag(
    payload: RAGQueryRequest,
    rag_service: AcademicRAGService = Depends(get_rag_service),
):
    try:
        return await rag_service.answer_question(payload)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"RAG engine error: {str(err)}")

