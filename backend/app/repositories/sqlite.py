import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import aiosqlite

from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.models.unit import SyllabusUnitCreate, SyllabusUnitResponse
from app.models.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    SourceType,
    ProcessingStatus,
    DocumentPageResponse,
)
from app.repositories.base import WorkspaceRepository


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(dt_str: str) -> datetime:
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return datetime.now(timezone.utc)


class SQLiteWorkspaceRepository(WorkspaceRepository):
    def __init__(self, db_path: Path):
        self.db_path = db_path

    async def init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            await db.execute("""
                CREATE TABLE IF NOT EXISTS subjects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT,
                    description TEXT,
                    semester TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS syllabus_units (
                    id TEXT PRIMARY KEY,
                    subject_id TEXT NOT NULL,
                    unit_number INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                );
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS academic_resources (
                    id TEXT PRIMARY KEY,
                    subject_id TEXT NOT NULL,
                    unit_id TEXT,
                    title TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size_bytes INTEGER DEFAULT 0,
                    storage_path TEXT,
                    status TEXT NOT NULL DEFAULT 'ready',
                    page_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                    FOREIGN KEY (unit_id) REFERENCES syllabus_units(id) ON DELETE SET NULL
                );
            """)

            # Safe column migration for existing tables
            try:
                await db.execute("ALTER TABLE academic_resources ADD COLUMN page_count INTEGER DEFAULT 0;")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE academic_resources ADD COLUMN error_message TEXT;")
            except Exception:
                pass

            await db.execute("""
                CREATE TABLE IF NOT EXISTS document_pages (
                    id TEXT PRIMARY KEY,
                    resource_id TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    char_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (resource_id) REFERENCES academic_resources(id) ON DELETE CASCADE
                );
            """)
            await db.commit()

    async def create_subject(self, data: SubjectCreate) -> SubjectResponse:
        subject_id = str(uuid.uuid4())
        now = utc_now_iso()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO subjects (id, name, code, description, semester, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (subject_id, data.name, data.code, data.description, data.semester, now, now),
            )
            await db.commit()

        return SubjectResponse(
            id=subject_id,
            name=data.name,
            code=data.code,
            description=data.description,
            semester=data.semester,
            created_at=parse_iso(now),
            updated_at=parse_iso(now),
            unit_count=0,
            resource_count=0,
        )

    async def get_subject(self, subject_id: str) -> Optional[SubjectResponse]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = """
                SELECT 
                    s.id, s.name, s.code, s.description, s.semester, s.created_at, s.updated_at,
                    (SELECT COUNT(*) FROM syllabus_units u WHERE u.subject_id = s.id) AS unit_count,
                    (SELECT COUNT(*) FROM academic_resources r WHERE r.subject_id = s.id) AS resource_count
                FROM subjects s
                WHERE s.id = ?
            """
            async with db.execute(query, (subject_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return SubjectResponse(
                    id=row["id"],
                    name=row["name"],
                    code=row["code"],
                    description=row["description"],
                    semester=row["semester"],
                    created_at=parse_iso(row["created_at"]),
                    updated_at=parse_iso(row["updated_at"]),
                    unit_count=row["unit_count"],
                    resource_count=row["resource_count"],
                )

    async def list_subjects(self) -> list[SubjectResponse]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = """
                SELECT 
                    s.id, s.name, s.code, s.description, s.semester, s.created_at, s.updated_at,
                    (SELECT COUNT(*) FROM syllabus_units u WHERE u.subject_id = s.id) AS unit_count,
                    (SELECT COUNT(*) FROM academic_resources r WHERE r.subject_id = s.id) AS resource_count
                FROM subjects s
                ORDER BY s.created_at DESC
            """
            async with db.execute(query) as cursor:
                rows = await cursor.fetchall()
                return [
                    SubjectResponse(
                        id=row["id"],
                        name=row["name"],
                        code=row["code"],
                        description=row["description"],
                        semester=row["semester"],
                        created_at=parse_iso(row["created_at"]),
                        updated_at=parse_iso(row["updated_at"]),
                        unit_count=row["unit_count"],
                        resource_count=row["resource_count"],
                    )
                    for row in rows
                ]

    async def update_subject(self, subject_id: str, data: SubjectUpdate) -> Optional[SubjectResponse]:
        existing = await self.get_subject(subject_id)
        if not existing:
            return None

        updated_name = data.name if data.name is not None else existing.name
        updated_code = data.code if data.code is not None else existing.code
        updated_desc = data.description if data.description is not None else existing.description
        updated_sem = data.semester if data.semester is not None else existing.semester
        now = utc_now_iso()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE subjects 
                SET name = ?, code = ?, description = ?, semester = ?, updated_at = ?
                WHERE id = ?
                """,
                (updated_name, updated_code, updated_desc, updated_sem, now, subject_id),
            )
            await db.commit()

        return await self.get_subject(subject_id)

    async def delete_subject(self, subject_id: str) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            cursor = await db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def create_unit(self, subject_id: str, data: SyllabusUnitCreate) -> SyllabusUnitResponse:
        unit_id = str(uuid.uuid4())
        now = utc_now_iso()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            await db.execute(
                """
                INSERT INTO syllabus_units (id, subject_id, unit_number, title, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (unit_id, subject_id, data.unit_number, data.title, data.description, now),
            )
            await db.commit()

        return SyllabusUnitResponse(
            id=unit_id,
            subject_id=subject_id,
            unit_number=data.unit_number,
            title=data.title,
            description=data.description,
            created_at=parse_iso(now),
        )

    async def list_units(self, subject_id: str) -> list[SyllabusUnitResponse]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = """
                SELECT id, subject_id, unit_number, title, description, created_at
                FROM syllabus_units
                WHERE subject_id = ?
                ORDER BY unit_number ASC, created_at ASC
            """
            async with db.execute(query, (subject_id,)) as cursor:
                rows = await cursor.fetchall()
                return [
                    SyllabusUnitResponse(
                        id=row["id"],
                        subject_id=row["subject_id"],
                        unit_number=row["unit_number"],
                        title=row["title"],
                        description=row["description"],
                        created_at=parse_iso(row["created_at"]),
                    )
                    for row in rows
                ]

    async def delete_unit(self, unit_id: str) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM syllabus_units WHERE id = ?", (unit_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def create_resource(self, data: ResourceCreate) -> ResourceResponse:
        resource_id = str(uuid.uuid4())
        now = utc_now_iso()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            await db.execute(
                """
                INSERT INTO academic_resources 
                (id, subject_id, unit_id, title, source_type, file_name, file_type, file_size_bytes, storage_path, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    resource_id,
                    data.subject_id,
                    data.unit_id,
                    data.title,
                    data.source_type.value,
                    data.file_name,
                    data.file_type,
                    data.file_size_bytes,
                    data.storage_path,
                    ProcessingStatus.READY.value,
                    now,
                    now,
                ),
            )
            await db.commit()

        return ResourceResponse(
            id=resource_id,
            subject_id=data.subject_id,
            unit_id=data.unit_id,
            title=data.title,
            source_type=data.source_type,
            file_name=data.file_name,
            file_type=data.file_type,
            file_size_bytes=data.file_size_bytes,
            storage_path=data.storage_path,
            status=ProcessingStatus.READY,
            created_at=parse_iso(now),
            updated_at=parse_iso(now),
        )

    async def get_resource(self, resource_id: str) -> Optional[ResourceResponse]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = "SELECT * FROM academic_resources WHERE id = ?"
            async with db.execute(query, (resource_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return ResourceResponse(
                    id=row["id"],
                    subject_id=row["subject_id"],
                    unit_id=row["unit_id"],
                    title=row["title"],
                    source_type=SourceType(row["source_type"]),
                    file_name=row["file_name"],
                    file_type=row["file_type"],
                    file_size_bytes=row["file_size_bytes"],
                    storage_path=row["storage_path"],
                    status=ProcessingStatus(row["status"]),
                    page_count=row["page_count"] or 0,
                    error_message=row["error_message"],
                    created_at=parse_iso(row["created_at"]),
                    updated_at=parse_iso(row["updated_at"]),
                )

    async def list_resources(
        self,
        subject_id: Optional[str] = None,
        unit_id: Optional[str] = None,
        source_type: Optional[SourceType] = None,
    ) -> list[ResourceResponse]:
        conditions = []
        params = []
        if subject_id:
            conditions.append("subject_id = ?")
            params.append(subject_id)
        if unit_id:
            conditions.append("unit_id = ?")
            params.append(unit_id)
        if source_type:
            conditions.append("source_type = ?")
            params.append(source_type.value)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = f"SELECT * FROM academic_resources {where_clause} ORDER BY created_at DESC"
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [
                    ResourceResponse(
                        id=row["id"],
                        subject_id=row["subject_id"],
                        unit_id=row["unit_id"],
                        title=row["title"],
                        source_type=SourceType(row["source_type"]),
                        file_name=row["file_name"],
                        file_type=row["file_type"],
                        file_size_bytes=row["file_size_bytes"],
                        storage_path=row["storage_path"],
                        status=ProcessingStatus(row["status"]),
                        page_count=row["page_count"] or 0,
                        error_message=row["error_message"],
                        created_at=parse_iso(row["created_at"]),
                        updated_at=parse_iso(row["updated_at"]),
                    )
                    for row in rows
                ]

    async def update_resource(
        self,
        resource_id: str,
        data: ResourceUpdate,
        page_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[ResourceResponse]:
        existing = await self.get_resource(resource_id)
        if not existing:
            return None

        updated_title = data.title if data.title is not None else existing.title
        updated_source_type = (
            data.source_type.value if data.source_type is not None else existing.source_type.value
        )
        updated_unit_id = data.unit_id if data.unit_id is not None else existing.unit_id
        updated_status = data.status.value if data.status is not None else existing.status.value
        updated_storage = data.storage_path if data.storage_path is not None else existing.storage_path
        updated_page_count = page_count if page_count is not None else existing.page_count
        updated_err = error_message if error_message is not None else existing.error_message
        now = utc_now_iso()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE academic_resources 
                SET title = ?, source_type = ?, unit_id = ?, status = ?, storage_path = ?, page_count = ?, error_message = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    updated_title,
                    updated_source_type,
                    updated_unit_id,
                    updated_status,
                    updated_storage,
                    updated_page_count,
                    updated_err,
                    now,
                    resource_id,
                ),
            )
            await db.commit()

        return await self.get_resource(resource_id)

    async def delete_resource(self, resource_id: str) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM academic_resources WHERE id = ?", (resource_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def save_document_pages(self, resource_id: str, pages: list[dict]) -> None:
        now = utc_now_iso()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            for p in pages:
                page_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO document_pages (id, resource_id, page_number, content, char_count, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        page_id,
                        resource_id,
                        p["page_number"],
                        p["content"],
                        p["char_count"],
                        now,
                    ),
                )
            await db.commit()

    async def get_document_pages(self, resource_id: str) -> list[DocumentPageResponse]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = """
                SELECT id, resource_id, page_number, content, char_count, created_at
                FROM document_pages
                WHERE resource_id = ?
                ORDER BY page_number ASC
            """
            async with db.execute(query, (resource_id,)) as cursor:
                rows = await cursor.fetchall()
                return [
                    DocumentPageResponse(
                        id=row["id"],
                        resource_id=row["resource_id"],
                        page_number=row["page_number"],
                        content=row["content"],
                        char_count=row["char_count"],
                        created_at=parse_iso(row["created_at"]),
                    )
                    for row in rows
                ]

