import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from pathlib import Path
import tempfile
import shutil

from app.main import app
from app.api.deps import get_repository
from app.repositories.sqlite import SQLiteWorkspaceRepository


@pytest.fixture(scope="session")
def temp_test_dir():
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest_asyncio.fixture
async def client(temp_test_dir):
    test_db_path = temp_test_dir / "test_afg.db"
    test_repo = SQLiteWorkspaceRepository(test_db_path)
    await test_repo.init_db()

    app.dependency_overrides[get_repository] = lambda: test_repo

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "persistence_mode" in data


@pytest.mark.asyncio
async def test_subject_lifecycle(client: AsyncClient):
    # 1. Create a subject
    payload = {
        "name": "Data Structures & Algorithms",
        "code": "CS201",
        "description": "Fundamental data structures and algorithmic paradigms",
        "semester": "Semester 3",
    }
    create_res = await client.post("/api/subjects", json=payload)
    assert create_res.status_code == 201
    subject = create_res.json()
    assert subject["name"] == payload["name"]
    assert subject["code"] == payload["code"]
    subject_id = subject["id"]

    # 2. Get subject by ID
    get_res = await client.get(f"/api/subjects/{subject_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == subject_id

    # 3. List subjects
    list_res = await client.get("/api/subjects")
    assert list_res.status_code == 200
    assert any(s["id"] == subject_id for s in list_res.json())

    # 4. Update subject
    update_res = await client.patch(
        f"/api/subjects/{subject_id}",
        json={"name": "Advanced Data Structures", "code": "CS201-ADV"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Advanced Data Structures"
    assert update_res.json()["code"] == "CS201-ADV"

    # 5. Delete subject
    del_res = await client.delete(f"/api/subjects/{subject_id}")
    assert del_res.status_code == 204

    # 6. Verify deleted
    get_deleted = await client.get(f"/api/subjects/{subject_id}")
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_syllabus_units_and_resources(client: AsyncClient):
    # Setup subject
    subj_res = await client.post(
        "/api/subjects",
        json={"name": "Digital Logic Design", "code": "EC101"},
    )
    assert subj_res.status_code == 201
    subject_id = subj_res.json()["id"]

    # Create Unit
    unit_res = await client.post(
        f"/api/subjects/{subject_id}/units",
        json={
            "unit_number": 1,
            "title": "Boolean Algebra & Logic Gates",
            "description": "K-maps, truth tables, and basic logic gates",
        },
    )
    assert unit_res.status_code == 201
    unit = unit_res.json()
    assert unit["unit_number"] == 1
    assert unit["subject_id"] == subject_id
    unit_id = unit["id"]

    # List units
    units_res = await client.get(f"/api/subjects/{subject_id}/units")
    assert units_res.status_code == 200
    assert len(units_res.json()) == 1

    # Create Resource associated with Subject and Unit
    resource_res = await client.post(
        "/api/resources",
        json={
            "subject_id": subject_id,
            "unit_id": unit_id,
            "title": "Digital Principles 8th Edition - Chapter 2",
            "source_type": "textbook",
            "file_name": "digital_principles_ch2.pdf",
            "file_type": "pdf",
            "file_size_bytes": 1048576,
            "storage_path": "uploads/digital_principles_ch2.pdf",
        },
    )
    assert resource_res.status_code == 201
    res_data = resource_res.json()
    assert res_data["title"] == "Digital Principles 8th Edition - Chapter 2"
    assert res_data["source_type"] == "textbook"
    assert res_data["unit_id"] == unit_id
    resource_id = res_data["id"]

    # Verify counts on subject
    updated_subj = await client.get(f"/api/subjects/{subject_id}")
    assert updated_subj.json()["unit_count"] == 1
    assert updated_subj.json()["resource_count"] == 1

    # Filter resources
    filter_res = await client.get(f"/api/resources?subject_id={subject_id}&source_type=textbook")
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 1

    # Cleanup resource
    del_resource = await client.delete(f"/api/resources/{resource_id}")
    assert del_resource.status_code == 204

    # Cleanup unit
    del_unit = await client.delete(f"/api/units/{unit_id}")
    assert del_unit.status_code == 204

