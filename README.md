# AFG — Personal Academic RAG Assistant

AFG is a personal academic knowledge assistant designed to organize a student's syllabus, textbooks, lecture notes, and previous examination papers into an organized, searchable workspace. It delivers source-grounded answers with traceable page-level citations and visual explanations (such as Mermaid flowcharts) when useful.

---

## Key Principles

- **Source-First Grounding**: Answers are grounded strictly in uploaded academic documents. The assistant never fabricates page numbers, excerpts, or citations.
- **Subject-Aware Isolation**: Materials and retrieval queries are isolated by subject workspace and syllabus units.
- **Calm, Minimalist Aesthetic**: A focused monochrome study interface by default, with optional themes (Claude warm editorial, Gemini cool indigo, DeepSeek midnight slate, and Kimi clean mint).
- **Phased & Audited Architecture**: Developed in incremental, audited phases per [`docs/phases.md`](docs/phases.md) and [`docs/agent.md`](docs/agent.md).

---

## Project Structure

```text
rag/
├── docs/
│   ├── idea.md             # Core concept and product specifications
│   ├── agent.md            # Coding agent instructions, stack rules, and guidelines
│   └── phases.md           # Phased development roadmap and append-only audit trail
├── frontend/               # Next.js App Router (TypeScript, React 19, Tailwind CSS)
│   ├── src/
│   │   ├── app/            # App Router pages and layout
│   │   ├── components/     # AppLayout, ThemeProvider, ThemeSelector, Modals
│   │   └── lib/            # Theme tokens and API client helpers
├── backend/                # Python FastAPI Backend (managed via uv)
│   ├── app/
│   │   ├── api/            # Route handlers (subjects, resources, units)
│   │   ├── models/         # Pydantic domain models and schemas
│   │   ├── repositories/   # Persistence layer (SQLite fallback & Supabase-ready)
│   │   ├── services/       # Business logic (workspaces, resources)
│   │   └── main.py         # FastAPI application entry point
│   ├── pyproject.toml      # uv-managed Python project definition
│   └── tests/              # Pytest backend test suite
└── README.md               # Project documentation and setup instructions
```

---

## Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS v4, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn, managed with `uv`.
- **LLM & AI Providers**: Flexible multi-provider support for **Nemotron** (NVIDIA NIM), **Google Gemini**, **Groq** (Llama 3.3 / Mixtral), and **OpenAI**, with deterministic local academic offline fallback.
- **Database & Storage**: Dual persistence abstraction — SQLite for rapid local development/offline study, with a clean repository interface for Supabase (PostgreSQL + pgvector + Supabase Storage).

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended, tested on v22.13) & `pnpm` (v10+)
- Python (v3.11+) & `uv` (v0.10+)

### 1. Frontend Setup

```bash
cd frontend
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 2. Backend Setup

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) to view the interactive OpenAPI documentation.

---

## Development Roadmap & Audit

Development follows the audited phase plan outlined in [`docs/phases.md`](docs/phases.md):

- [x] **Phase 0**: Repository and Project Foundation Review
- [x] **Phase 1**: Minimal App Shell and Theme System
- [x] **Phase 2**: Subject Workspaces and Academic Resource Records
- [x] **Phase 3**: Upload, Storage, and Document Processing (OCR & Parsing)
- [x] **Phase 4**: Academic RAG Retrieval and Grounded Answering
- [x] **Phase 5**: Citations and Page-Level Source Navigation
- [ ] **Phase 6**: Visual Explanations and Mermaid Flowchart Rendering
- [ ] **Phase 7**: Previous Question Paper Workflows & Exam Formatting
- [ ] **Phase 8**: Reliability, Security, and Release Review

