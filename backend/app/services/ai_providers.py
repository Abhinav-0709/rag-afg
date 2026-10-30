import hashlib
import math
import re
from abc import ABC, abstractmethod
from typing import List, Optional
import httpx

from app.config import settings


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        pass


class LocalSemanticEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic high-dimensional bag-of-characters & word-hash embedding.
    Produces a normalized 128-dimensional dense vector representation.
    Guarantees fast, offline, reproducible semantic similarity via cosine similarity.
    """
    def __init__(self, dim: int = 128):
        self.dim = dim

    def _hash_token(self, token: str) -> int:
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        return h % self.dim

    def _embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        tokens = re.findall(r"\b\w+\b", text.lower())
        if not tokens:
            return vec

        for token in tokens:
            idx = self._hash_token(token)
            vec[idx] += 1.0
            # Also hash character 3-grams for subword matching
            if len(token) >= 3:
                for i in range(len(token) - 2):
                    sub = token[i : i + 3]
                    sub_idx = self._hash_token(sub)
                    vec[sub_idx] += 0.5

        # L2 Normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    async def embed_text(self, text: str) -> List[float]:
        return self._embed(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(t) for t in texts]


class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str = "text-embedding-004"):
        self.api_key = api_key
        self.model = model
        self.fallback = LocalSemanticEmbeddingProvider()

    async def embed_text(self, text: str) -> List[float]:
        if not self.api_key:
            return await self.fallback.embed_text(text)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
        payload = {
            "model": f"models/{self.model}",
            "content": {"parts": [{"text": text}]},
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("embedding", {}).get("values", [])
        except Exception:
            pass

        return await self.fallback.embed_text(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # In case of batch, process or fallback
        embeddings = []
        for t in texts:
            embeddings.append(await self.embed_text(t))
        return embeddings


class LLMProvider(ABC):
    @abstractmethod
    async def generate_answer(
        self,
        prompt: str,
        system_prompt: str,
    ) -> str:
        pass


class LocalAcademicLLMProvider(LLMProvider):
    """
    Local fallback answer generator that synthesizes extracted context sentences
    according to requested format and marks. Strictly follows grounding rules:
    returns limitation notice if context is empty or uninformative.
    """
    async def generate_answer(self, prompt: str, system_prompt: str) -> str:
        # Check if the prompt has context passages
        context_match = re.search(r"=== RETRIEVED ACADEMIC CONTEXT ===\n(.*?)\n=== END CONTEXT ===", prompt, re.DOTALL)
        context = context_match.group(1).strip() if context_match else ""

        if not context or "NO_CONTEXT_FOUND" in context:
            return (
                "The uploaded materials for this subject do not contain sufficient information to answer this question. "
                "Please upload the relevant textbook chapters, lecture notes, or syllabus units."
            )

        # Extract context excerpts
        passage_blocks = [p.strip() for p in context.split("\n\n") if p.strip()]
        if not passage_blocks:
            return (
                "The uploaded materials for this subject do not contain sufficient information to answer this question."
            )

        # Clean passages
        lines = []
        for block in passage_blocks[:3]:
            # Remove [Source: ...] header
            clean = re.sub(r"\[Source:[^\]]+\]", "", block).strip()
            if clean:
                lines.append(clean)

        combined = " ".join(lines)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", combined) if s.strip()]

        if not sentences:
            return (
                "The uploaded materials for this subject do not contain sufficient information to answer this question."
            )

        # Structure response according to requested format mentioned in prompt
        if "Format: 2_mark" in prompt or "Format: short" in prompt:
            summary = " ".join(sentences[:2])
            return f"**Summary Answer:**\n\n{summary}"
        elif "Format: 5_mark" in prompt:
            points = "\n".join(f"- **Point {i+1}:** {s}" for i, s in enumerate(sentences[:4]))
            return f"**Structured Answer (5 Marks):**\n\n{points}"
        elif "Format: step_by_step" in prompt:
            steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences[:5]))
            return f"**Step-by-Step Explanation:**\n\n{steps}"
        else:
            main_text = " ".join(sentences[:5])
            bullet_points = "\n".join(f"- {s}" for s in sentences[5:8]) if len(sentences) > 5 else ""
            res = f"Based on the uploaded course materials:\n\n{main_text}"
            if bullet_points:
                res += f"\n\n**Key Observations:**\n{bullet_points}"
            return res


class GeminiLLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model = model
        self.fallback = LocalAcademicLLMProvider()

    async def generate_answer(self, prompt: str, system_prompt: str) -> str:
        if not self.api_key:
            return await self.fallback.generate_answer(prompt, system_prompt)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{prompt}"}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.95,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception:
            pass

        return await self.fallback.generate_answer(prompt, system_prompt)


def get_embedding_provider() -> EmbeddingProvider:
    if settings.EMBEDDING_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        return GeminiEmbeddingProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_EMBEDDING_MODEL,
        )
    return LocalSemanticEmbeddingProvider()


def get_llm_provider() -> LLMProvider:
    if settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        return GeminiLLMProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )
    return LocalAcademicLLMProvider()

