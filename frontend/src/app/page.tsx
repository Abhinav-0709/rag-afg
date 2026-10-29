import { AppLayout } from "@/components/AppLayout";
import {
  FolderKanban,
  FileUp,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <Sparkles className="h-3 w-3 text-[var(--accent-primary)]" />
                <span>Personal Academic Knowledge Base</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Welcome to AFG Academic Assistant
              </h1>
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                Organize textbooks, syllabus documents, lecture notes, and previous question papers by subject.
                Ask questions grounded strictly in your uploaded materials with traceable page-level citations and visual diagrams.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 pt-6 border-t border-[var(--border-subtle)]">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-primary)]">
                1
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-[var(--text-primary)]">Subject Workspaces</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Separate topics to isolate retrieval context.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-primary)]">
                2
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-[var(--text-primary)]">Resource Ingestion</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Preserve page numbers, OCR notes, and units.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-primary)]">
                3
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-[var(--text-primary)]">Grounded Q&A & Visuals</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Verifiable citations and Mermaid flowcharts.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Subject Workspaces Section with Empty State */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Subject Workspaces
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Active academic courses and subjects in your workspace.
              </p>
            </div>
          </div>

          {/* Empty state per Phase 1 scope */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] mb-3">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              No subjects created yet
            </h3>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
              Create your first subject workspace (e.g., &ldquo;Data Structures&rdquo; or &ldquo;Digital Electronics&rdquo;) to start organizing study materials.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">
              <span>Ready for Phase 2: Subject Creation</span>
              <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
            </div>
          </div>
        </section>

        {/* Academic Resources Overview with Empty State */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Uploaded Academic Resources
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Syllabus documents, textbooks, lecture notes, and question papers.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] mb-3">
              <FileUp className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              No documents uploaded
            </h3>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
              Documents will be organized under their corresponding subject workspace once created.
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> PDF / Scanned PDF
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> DOCX / TXT
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Image Notes
              </span>
            </div>
          </div>
        </section>

        {/* Grounding & Ethics Notice */}
        <footer className="rounded border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--text-secondary)] flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--text-primary)]">Source Grounding Principle: </span>
            Answers are retrieved and cited strictly from your uploaded materials. The assistant never hallucinates citations or page numbers.
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
