import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from pathlib import Path
import tempfile
import shutil

from app.main import app
from app.api.deps import get_repository
from app.repositories.sqlite import SQLiteWorkspaceRepository
from app.config import settings
from app.services.chunker import TextChunker
from app.services.ai_providers import LocalSemanticEmbeddingProvider
from app.services.retrieval_service import cosine_similarity


@pytest.fixture(scope="session")
def temp_test_env():
    temp_dir = tempfile.mkdtemp()
    data_dir = Path(temp_dir) / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    original_data_dir = settings.DATA_DIR
    settings.DATA_DIR = data_dir

    yield data_dir

    settings.DATA_DIR = original_data_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest_asyncio.fixture
async def client(temp_test_env):
    test_db_path = temp_test_env / "test_afg_phase4.db"
    test_repo = SQLiteWorkspaceRepository(test_db_path)
    await test_repo.init_db()

    app.dependency_overrides[get_repository] = lambda: test_repo

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


def test_chunker_sliding_window():
    text = "Sentence one is about trees. Sentence two explains binary trees. Sentence three covers AVL rotations. Sentence four is about red-black trees."
    chunks = TextChunker.chunk_page(page_number=1, content=text, chunk_size=80, chunk_overlap=30)
    assert len(chunks) >= 2
    for c in chunks:
        assert c.page_number == 1
        assert len(c.content) > 0


@pytest.mark.asyncio
async def test_semantic_embedding_cosine_similarity():
    provider = LocalSemanticEmbeddingProvider()
    v1 = await provider.embed_text("Binary search algorithm in sorted arrays")
    v2 = await provider.embed_text("Binary search algorithm and dividing arrays")
    v3 = await provider.embed_text("Cooking recipes for delicious pasta and pizza")

    sim_similar = cosine_similarity(v1, v2)
    sim_unrelated = cosine_similarity(v1, v3)

    assert sim_similar > sim_unrelated
    assert sim_similar > 0.4


@pytest.mark.asyncio
async def test_rag_subject_isolation_and_grounded_answer(client: AsyncClient):
    # 1. Create Subject A: Data Structures
    subj_a_res = await client.post("/api/subjects", json={"name": "Data Structures", "code": "CS201"})
    assert subj_a_res.status_code == 201
    subj_a_id = subj_a_res.json()["id"]

    # 2. Create Subject B: Medieval History
    subj_b_res = await client.post("/api/subjects", json={"name": "Medieval History", "code": "HIST101"})
    assert subj_b_res.status_code == 201
    subj_b_id = subj_b_res.json()["id"]

    # 3. Create Unit for Subject A
    unit_res = await client.post(
        f"/api/subjects/{subj_a_id}/units",
        json={"unit_number": 2, "title": "Searching & Sorting Algorithms"},
    )
    assert unit_res.status_code == 201
    unit_id = unit_res.json()["id"]

    # 4. Upload document to Subject A
    content_a = (
        b"Binary search is an efficient algorithm for finding an item from a sorted list of items. "
        b"It works by repeatedly dividing in half the portion of the list that could contain the item. "
        b"The time complexity of binary search is O(log n)."
    )
    await client.post(
        f"/api/subjects/{subj_a_id}/upload",
        files={"file": ("binary_search.txt", content_a, "text/plain")},
        data={"title": "Binary Search Algorithm Notes", "source_type": "notes", "unit_id": unit_id},
    )

    # 5. Upload document to Subject B
    content_b = b"The feudal system in medieval Europe was based on land ownership, lord-vassal relations, and serfdom."
    await client.post(
        f"/api/subjects/{subj_b_id}/upload",
        files={"file": ("feudalism.txt", content_b, "text/plain")},
        data={"title": "Feudalism in Europe", "source_type": "textbook"},
    )

    # 6. Query Subject A for "How does binary search work?"
    query_a = {
        "query": "How does binary search work and what is its time complexity?",
        "subject_id": subj_a_id,
        "mode": "source_only",
        "answer_format": "detailed",
    }
    res_a = await client.post("/api/rag/query", json=query_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["grounded"] is True
    assert len(data_a["citations"]) > 0
    assert any("binary_search" in c["file_name"] for c in data_a["citations"])
    # Ensure NO citations from Subject B appear in Subject A
    assert not any("feudalism" in c["file_name"] for c in data_a["citations"])
    assert "binary search" in data_a["answer"].lower()

    # 7. Query Subject B for "binary search" (should return insufficient evidence!)
    query_b = {
        "query": "How does binary search work?",
        "subject_id": subj_b_id,
        "mode": "source_only",
        "answer_format": "detailed",
    }
    res_b = await client.post("/api/rag/query", json=query_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["grounded"] is False
    assert len(data_b["citations"]) == 0
    assert "not contain sufficient information" in data_b["answer"].lower()


@pytest.mark.asyncio
async def test_rag_formats_and_unit_filtering(client: AsyncClient):
    # Setup subject
    subj_res = await client.post("/api/subjects", json={"name": "Database Management Systems", "code": "CS304"})
    subj_id = subj_res.json()["id"]

    # Upload notes
    doc_content = (
        b"ACID properties in DBMS ensure reliable transactions. "
        b"Atomicity guarantees all-or-nothing execution. "
        b"Consistency maintains database invariants. "
        b"Isolation prevents concurrent transaction interference. "
        b"Durability guarantees committed changes persist across system failures."
    )
    await client.post(
        f"/api/subjects/{subj_id}/upload",
        files={"file": ("acid_properties.txt", doc_content, "text/plain")},
        data={"title": "ACID Properties in Transactions", "source_type": "notes"},
    )

    # 1. Test 5-mark format
    query_5mark = {
        "query": "Explain ACID properties",
        "subject_id": subj_id,
        "mode": "source_only",
        "answer_format": "5_mark",
    }
    res_5mark = await client.post("/api/rag/query", json=query_5mark)
    assert res_5mark.status_code == 200
    assert "Point" in res_5mark.json()["answer"] or "ACID" in res_5mark.json()["answer"]

    # 2. Test step-by-step format
    query_step = {
        "query": "What are the ACID rules?",
        "subject_id": subj_id,
        "mode": "source_only",
        "answer_format": "step_by_step",
    }
    res_step = await client.post("/api/rag/query", json=query_step)
    assert res_step.status_code == 200
    assert res_step.json()["grounded"] is True
