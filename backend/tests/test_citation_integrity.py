import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from pathlib import Path
import tempfile
import shutil

from app.main import app
from app.api.deps import get_repository
from app.repositories.sqlite import SQLiteWorkspaceRepository
from app.services.workspace_service import WorkspaceService
from app.services.rag_service import AcademicRAGService
from app.models.subject import SubjectCreate
from app.models.resource import SourceType
from app.models.rag import CitationVerificationRequest


@pytest.fixture(scope="session")
def temp_test_env():
    temp_dir = tempfile.mkdtemp()
    data_dir = Path(temp_dir) / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    yield data_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest_asyncio.fixture
async def citation_fixture(temp_test_env):
    test_db_path = temp_test_env / "test_citations.db"
    test_repo = SQLiteWorkspaceRepository(test_db_path)
    await test_repo.init_db()

    app.dependency_overrides[get_repository] = lambda: test_repo
    ws_service = WorkspaceService(repo=test_repo)
    rag_service = AcademicRAGService(repo=test_repo)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield {
            "repo": test_repo,
            "ws": ws_service,
            "rag": rag_service,
            "client": ac,
        }

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_citation_verification_valid_and_invalid(citation_fixture):
    ws_service: WorkspaceService = citation_fixture["ws"]
    rag_service: AcademicRAGService = citation_fixture["rag"]

    # 1. Create a subject workspace
    subject = await ws_service.create_subject(
        SubjectCreate(name="Operating Systems", code="CS301", description="Kernel concepts")
    )

    # 2. Upload text document with multiple pages
    doc_content = "Page one discusses process scheduling and preemptive context switching.\n--- PAGE 2 ---\nPage two discusses virtual memory, page replacement algorithms, and TLB hits."
    resource = await ws_service.process_and_store_file(
        subject_id=subject.id,
        title="OS Concept Notes",
        source_type=SourceType.NOTES,
        file_name="os_notes.txt",
        file_bytes=doc_content.encode("utf-8"),
    )

    # 3. Verify valid citation on page 1
    valid_req = CitationVerificationRequest(
        subject_id=subject.id,
        resource_id=resource.id,
        chunk_id="chk-sample-1",
        page_number=1,
    )
    result = await rag_service.verify_citation(valid_req)
    assert result.valid is True
    assert result.subject_match is True
    assert result.resource_exists is True
    assert result.page_exists is True
    assert result.resource_title == "OS Concept Notes"
    assert result.page_number == 1
    assert "process scheduling" in (result.surrounding_context or "")

    # 4. Verify invalid citation: non-existent page 99
    invalid_page_req = CitationVerificationRequest(
        subject_id=subject.id,
        resource_id=resource.id,
        chunk_id="chk-sample-invalid-page",
        page_number=99,
    )
    result_invalid_page = await rag_service.verify_citation(invalid_page_req)
    assert result_invalid_page.valid is False
    assert result_invalid_page.page_exists is False
    assert "Page 99 does not exist" in result_invalid_page.message

    # 5. Verify invalid citation: non-existent resource
    invalid_res_req = CitationVerificationRequest(
        subject_id=subject.id,
        resource_id="non-existent-resource-id",
        chunk_id="chk-sample-invalid-res",
        page_number=1,
    )
    result_invalid_res = await rag_service.verify_citation(invalid_res_req)
    assert result_invalid_res.valid is False
    assert result_invalid_res.resource_exists is False

    # 6. Verify cross-subject citation leak prevention
    other_subject = await ws_service.create_subject(
        SubjectCreate(name="Database Systems", code="CS302")
    )
    cross_subject_req = CitationVerificationRequest(
        subject_id=other_subject.id,  # requesting under DB subject
        resource_id=resource.id,      # resource belongs to OS subject
        chunk_id="chk-cross",
        page_number=1,
    )
    result_cross = await rag_service.verify_citation(cross_subject_req)
    assert result_cross.valid is False
    assert result_cross.subject_match is False
    assert "belongs to another subject" in result_cross.message


@pytest.mark.asyncio
async def test_citation_verification_api_endpoint(citation_fixture):
    ws_service: WorkspaceService = citation_fixture["ws"]
    client: AsyncClient = citation_fixture["client"]

    subject = await ws_service.create_subject(
        SubjectCreate(name="Distributed Systems", code="CS401")
    )
    resource = await ws_service.process_and_store_file(
        subject_id=subject.id,
        title="Raft Consensus Paper",
        source_type=SourceType.NOTES,
        file_name="raft.txt",
        file_bytes=b"Raft is a consensus algorithm designed for understandability.",
    )

    res = await client.post(
        "/api/rag/verify-citation",
        json={
            "subject_id": subject.id,
            "resource_id": resource.id,
            "chunk_id": "chunk-test-1",
            "page_number": 1,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["resource_title"] == "Raft Consensus Paper"
    assert data["page_number"] == 1

