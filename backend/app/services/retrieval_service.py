import json
import math
import re
from typing import List, Optional
from app.config import settings
from app.models.rag import RetrievedCitation
from app.models.resource import SourceType
from app.repositories.base import WorkspaceRepository
from app.services.ai_providers import get_embedding_provider


STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how",
    "i", "if", "in", "into", "is", "it", "its", "just", "me", "more", "most", "my", "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "our", "out", "over", "own", "same", "she",
    "should", "so", "some", "such", "than", "that", "the", "their", "them", "then", "there", "these",
    "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we",
    "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you",
    "your", "yours",
}


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


class HybridRetrievalService:
    def __init__(self, repo: WorkspaceRepository):
        self.repo = repo
        self.embedding_provider = get_embedding_provider()

    async def retrieve(
        self,
        subject_id: str,
        query: str,
        unit_id: Optional[str] = None,
        source_types: Optional[List[SourceType]] = None,
        top_k: int = 5,
    ) -> List[RetrievedCitation]:
        st_strings = [st.value for st in source_types] if source_types else None
        candidates = await self.repo.get_candidate_chunks(
            subject_id=subject_id,
            unit_id=unit_id,
            source_types=st_strings,
        )

        if not candidates:
            return []

        # Tokenize query and remove stopwords for lexical matching
        all_query_tokens = re.findall(r"\b\w+\b", query.lower())
        meaningful_tokens = [t for t in all_query_tokens if t not in STOPWORDS]
        tokens_to_match = set(meaningful_tokens) if meaningful_tokens else set(all_query_tokens)

        if not tokens_to_match:
            return []

        # Generate query embedding for semantic search
        query_vector = await self.embedding_provider.embed_text(query)

        scored_results: List[RetrievedCitation] = []

        for c in candidates:
            content = c["content"]
            content_lower = content.lower()
            content_tokens = re.findall(r"\b\w+\b", content_lower)

            # 1. Lexical / Keyword matching score
            matched_tokens = sum(1 for t in tokens_to_match if t in content_lower)
            token_coverage = matched_tokens / max(len(tokens_to_match), 1)
            raw_tf = sum(content_tokens.count(t) for t in tokens_to_match)
            keyword_score = 0.75 * token_coverage + 0.25 * min(raw_tf / 10.0, 1.0)

            # 2. Semantic vector score
            semantic_score = 0.0
            if c.get("embedding_json"):
                try:
                    chunk_vector = json.loads(c["embedding_json"])
                    sim = cosine_similarity(query_vector, chunk_vector)
                    semantic_score = max(0.0, sim)
                except Exception:
                    semantic_score = 0.0

            # 3. Hybrid fusion score
            hybrid_score = 0.5 * keyword_score + 0.5 * semantic_score

            # Syllabus unit bonus if explicit match
            if unit_id and c.get("unit_id") == unit_id:
                hybrid_score *= 1.15

            # Relevance threshold: requires genuine lexical presence or high semantic score
            if (keyword_score >= 0.25 and hybrid_score >= 0.20) or (hybrid_score >= 0.35 and matched_tokens > 0):
                # Excerpt: up to 250 characters around the first matched token
                excerpt = content
                if len(content) > 280:
                    first_match_pos = -1
                    for t in tokens_to_match:
                        pos = content_lower.find(t)
                        if pos != -1 and (first_match_pos == -1 or pos < first_match_pos):
                            first_match_pos = pos

                    if first_match_pos != -1:
                        start = max(0, first_match_pos - 40)
                        end = min(len(content), start + 240)
                        excerpt = ("..." if start > 0 else "") + content[start:end].strip() + ("..." if end < len(content) else "")
                    else:
                        excerpt = content[:250].strip() + "..."

                scored_results.append(
                    RetrievedCitation(
                        chunk_id=c["chunk_id"],
                        resource_id=c["resource_id"],
                        document_title=c["document_title"],
                        file_name=c["file_name"],
                        source_type=SourceType(c["source_type"]),
                        unit_id=c.get("unit_id"),
                        page_number=c["page_number"],
                        excerpt=excerpt,
                        score=round(hybrid_score, 4),
                    )
                )

        # Sort descending by hybrid score
        scored_results.sort(key=lambda x: x.score, reverse=True)
        return scored_results[:top_k]
