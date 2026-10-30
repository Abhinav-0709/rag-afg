import re
from typing import List
from pydantic import BaseModel


class DocumentChunkItem(BaseModel):
    page_number: int
    chunk_index: int
    content: str
    char_count: int
    token_count: int


class TextChunker:
    @staticmethod
    def chunk_page(
        page_number: int,
        content: str,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
    ) -> List[DocumentChunkItem]:
        text = content.strip()
        if not text:
            return []

        # If text is already shorter than chunk size, return it as a single chunk
        if len(text) <= chunk_size:
            return [
                DocumentChunkItem(
                    page_number=page_number,
                    chunk_index=1,
                    content=text,
                    char_count=len(text),
                    token_count=len(text.split()),
                )
            ]

        # Break text into sentence or paragraph segments
        sentence_delimiters = re.compile(r"(?<=[.!?\n])\s+")
        sentences = [s.strip() for s in sentence_delimiters.split(text) if s.strip()]

        chunks: List[DocumentChunkItem] = []
        current_chunk: List[str] = []
        current_length = 0
        chunk_idx = 1

        for sentence in sentences:
            sentence_len = len(sentence)
            if current_length + sentence_len > chunk_size and current_chunk:
                joined = " ".join(current_chunk)
                chunks.append(
                    DocumentChunkItem(
                        page_number=page_number,
                        chunk_index=chunk_idx,
                        content=joined,
                        char_count=len(joined),
                        token_count=len(joined.split()),
                    )
                )
                chunk_idx += 1

                # Keep overlap sentences
                overlap_chunk: List[str] = []
                overlap_len = 0
                for s in reversed(current_chunk):
                    if overlap_len + len(s) <= chunk_overlap:
                        overlap_chunk.insert(0, s)
                        overlap_len += len(s)
                    else:
                        break

                current_chunk = overlap_chunk
                current_length = sum(len(s) for s in current_chunk)

            current_chunk.append(sentence)
            current_length += sentence_len

        if current_chunk:
            joined = " ".join(current_chunk)
            chunks.append(
                DocumentChunkItem(
                    page_number=page_number,
                    chunk_index=chunk_idx,
                    content=joined,
                    char_count=len(joined),
                    token_count=len(joined.split()),
                )
            )

        return chunks

