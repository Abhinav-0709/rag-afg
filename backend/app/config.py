from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AFG Academic Assistant Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    # Persistence configuration (sqlite fallback or supabase)
    PERSISTENCE_MODE: str = "sqlite"  # 'sqlite' or 'supabase'
    DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
    SQLITE_DB_NAME: str = "afg_academic.db"
    UPLOAD_DIR_NAME: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS: set[str] = {
        "pdf",
        "docx",
        "txt",
        "png",
        "jpg",
        "jpeg",
    }

    # Supabase placeholders (for future hosted integration)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # CORS configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sqlite_db_path(self) -> Path:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return self.DATA_DIR / self.SQLITE_DB_NAME

    @property
    def upload_dir_path(self) -> Path:
        upload_path = self.DATA_DIR / self.UPLOAD_DIR_NAME
        upload_path.mkdir(parents=True, exist_ok=True)
        return upload_path


settings = Settings()

