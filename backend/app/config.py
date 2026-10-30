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

    # AI & LLM Provider Configuration
    AI_PROVIDER: str = "fallback"  # 'gemini', 'groq', 'nemotron', 'openai', or 'fallback'
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    NVIDIA_API_KEY: str = ""
    NEMOTRON_API_KEY: str = ""
    NEMOTRON_MODEL: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "fallback"  # 'gemini', 'openai', or 'fallback'
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    # RAG Chunking Parameters
    CHUNK_SIZE_CHARS: int = 800
    CHUNK_OVERLAP_CHARS: int = 150
    TOP_K_RETRIEVAL: int = 5

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

