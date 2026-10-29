"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { CreateSubjectModal } from "@/components/CreateSubjectModal";
import { SubjectWorkspaceView } from "@/components/SubjectWorkspaceView";
import { fetchSubjects, deleteSubject, Subject } from "@/lib/api";
import {
  FolderKanban,
  FileUp,
  Sparkles,
  Info,
  CheckCircle2,
  Plus,
  Layers,
  BookOpen,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = () => {
    setLoading(true);
    fetchSubjects()
      .then((data) => {
        setSubjects(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to connect to FastAPI backend at http://localhost:8000");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    fetchSubjects()
      .then((data) => {
        if (!ignore) {
          setSubjects(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Unable to connect to FastAPI backend at http://localhost:8000");
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleDeleteSubject(subjectId: string) {
    if (!confirm("Are you sure you want to delete this subject workspace? All linked syllabus units and resource records will be removed.")) {
      return;
    }
    try {
      await deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
      }
    } catch {
      alert("Failed to delete subject");
    }
  }

  // If a subject is selected, render its dedicated workspace
  if (selectedSubject) {
    return (
      <AppLayout
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelectSubject={setSelectedSubject}
        onNewSubjectClick={() => setIsCreateModalOpen(true)}
      >
        <SubjectWorkspaceView
          subject={selectedSubject}
          onBack={() => setSelectedSubject(null)}
          onSubjectDeleted={handleDeleteSubject}
        />
        <CreateSubjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubjectCreated={(newSubj) => {
            setSubjects((prev) => [newSubj, ...prev]);
            setSelectedSubject(newSubj);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      subjects={subjects}
      selectedSubject={null}
      onSelectSubject={setSelectedSubject}
      onNewSubjectClick={() => setIsCreateModalOpen(true)}
    >
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

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Subject Workspace</span>
            </button>
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

        {/* Backend connection warning if API is not active yet */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Backend offline or unreachable. Start the FastAPI server (`cd backend && uv run uvicorn app.main:app --port 8000`).
              </span>
            </div>
            <button
              type="button"
              onClick={loadSubjects}
              className="inline-flex items-center gap-1 font-medium hover:underline ml-3 shrink-0"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Subject Workspaces Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Subject Workspaces
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Select a subject to view its syllabus units and academic resources.
              </p>
            </div>
            {subjects.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Loading subject workspaces...
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] mb-3">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                No subjects created yet
              </h3>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
                Create your first subject workspace (e.g. &ldquo;Data Structures&rdquo; or &ldquo;Digital Electronics&rdquo;) to start organizing study materials.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Subject Workspace</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => setSelectedSubject(subj)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedSubject(subj);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group flex flex-col justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:border-[var(--border-active)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {subj.name}
                      </span>
                      {subj.code && (
                        <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-muted)]">
                          {subj.code}
                        </span>
                      )}
                    </div>
                    {subj.description && (
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {subj.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        <span>{subj.unit_count} Units</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{subj.resource_count} Files</span>
                      </span>
                    </div>
                    {subj.semester && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{subj.semester}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Academic Resources Overview */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Academic Resources Overview
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Curriculum documents, reference books, lecture notes, and question papers.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] mb-3">
              <FileUp className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              {subjects.length === 0
                ? "Create a subject workspace first"
                : "Select a subject workspace above to view and manage its materials"}
            </h3>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
              Documents are strictly organized under their respective course workspaces to ensure isolation during RAG retrieval.
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

      <CreateSubjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubjectCreated={(newSubj) => {
          setSubjects((prev) => [newSubj, ...prev]);
          setSelectedSubject(newSubj);
        }}
      />
    </AppLayout>
  );
}
