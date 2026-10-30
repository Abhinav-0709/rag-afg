"use client";

import React, { useState, useEffect } from "react";
import {
  Subject,
  SyllabusUnit,
  AcademicResource,
  fetchUnits,
  fetchResources,
  deleteUnit,
  deleteResource,
  getDownloadUrl,
} from "@/lib/api";
import { CreateUnitModal } from "@/components/CreateUnitModal";
import { UploadResourceModal } from "@/components/UploadResourceModal";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { SubjectChatTab } from "@/components/SubjectChatTab";
import {
  ArrowLeft,
  Layers,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Calendar,
  FileCheck,
  MessageSquare,
  UploadCloud,
  Eye,
  Download,
  AlertTriangle,
} from "lucide-react";

interface SubjectWorkspaceViewProps {
  subject: Subject;
  onBack: () => void;
  onSubjectDeleted: (subjectId: string) => void;
}

export function SubjectWorkspaceView({
  subject,
  onBack,
  onSubjectDeleted,
}: SubjectWorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<"units" | "resources" | "papers" | "chat">("units");
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [resources, setResources] = useState<AcademicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingResource, setViewingResource] = useState<AcademicResource | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetchUnits(subject.id).catch(() => []),
      fetchResources({ subject_id: subject.id }).catch(() => []),
    ])
      .then(([loadedUnits, loadedResources]) => {
        if (!ignore) {
          setUnits(loadedUnits);
          setResources(loadedResources);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load subject materials");
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
  }, [subject.id]);

  async function handleDeleteUnit(unitId: string) {
    if (!confirm("Are you sure you want to remove this syllabus unit?")) return;
    try {
      await deleteUnit(unitId);
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
    } catch {
      alert("Failed to delete unit");
    }
  }

  async function handleDeleteResource(resourceId: string) {
    if (!confirm("Are you sure you want to remove this document and its extracted text?")) return;
    try {
      await deleteResource(resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch {
      alert("Failed to delete resource");
    }
  }

  const filteredResources = resources.filter((r) => {
    if (activeTab === "papers") return r.source_type === "question_paper";
    if (resourceFilter === "all") return true;
    return r.source_type === resourceFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top navigation & Subject Header */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Workspaces</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                {subject.name}
              </h1>
              {subject.code && (
                <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                  {subject.code}
                </span>
              )}
              {subject.semester && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Calendar className="h-3 w-3" />
                  {subject.semester}
                </span>
              )}
            </div>
            {subject.description && (
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                {subject.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSubjectDeleted(subject.id)}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Subject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "units"
              ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Syllabus Units</span>
          <span className="rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)]">
            {units.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`flex items-center gap-2 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "resources"
              ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Academic Resources</span>
          <span className="rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)]">
            {resources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("papers")}
          className={`flex items-center gap-2 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "papers"
              ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Question Papers</span>
          <span className="rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)]">
            {resources.filter((r) => r.source_type === "question_paper").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "chat"
              ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Subject Q&A</span>
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tab: Syllabus Units */}
      {activeTab === "units" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Course Syllabus Units
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Curriculum breakdown for unit-filtered retrieval.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUnitModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Syllabus Unit</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Loading syllabus units...
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
              <Layers className="h-6 w-6 text-[var(--text-muted)] mb-2" />
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                No syllabus units added yet
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
                Add units from your course syllabus (e.g., &ldquo;Unit 1: Introduction to Trees&rdquo;) to organize academic resources by topic.
              </p>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Unit</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {units.map((unit) => {
                const unitResources = resources.filter((r) => r.unit_id === unit.id);
                return (
                  <div
                    key={unit.id}
                    className="flex items-start justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-active)]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] font-mono text-[10px] font-semibold text-[var(--text-primary)]">
                          {unit.unit_number}
                        </span>
                        <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                          {unit.title}
                        </h3>
                        <span className="rounded border border-[var(--border-default)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)]">
                          {unitResources.length} documents linked
                        </span>
                      </div>
                      {unit.description && (
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed pl-7">
                          {unit.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(unit.id)}
                      aria-label="Delete unit"
                      className="rounded p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Academic Resources or Question Papers */}
      {(activeTab === "resources" || activeTab === "papers") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {activeTab === "papers" ? "Previous Examination Papers" : "Academic Resources"}
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {activeTab === "papers"
                  ? "Question papers uploaded for exam pattern analysis and practice."
                  : "Textbooks, notes, and curriculum files for this subject."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "resources" && (
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                >
                  <option value="all">All Types</option>
                  <option value="textbook">Textbooks</option>
                  <option value="notes">Lecture Notes</option>
                  <option value="syllabus">Syllabus</option>
                  <option value="question_paper">Question Papers</option>
                  <option value="other">Other</option>
                </select>
              )}

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Loading academic documents...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
              <FileCheck className="h-6 w-6 text-[var(--text-muted)] mb-2" />
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                No documents uploaded yet
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)] max-w-sm">
                Upload your textbooks, notes, or examination papers (PDF, DOCX, TXT, images) to store and extract their content.
              </p>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredResources.map((res) => {
                const assignedUnit = units.find((u) => u.id === res.unit_id);
                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 transition-colors hover:border-[var(--border-active)] text-xs"
                  >
                    <div
                      onClick={() => setViewingResource(res)}
                      className="flex items-start gap-3 cursor-pointer flex-1"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] hover:underline">
                            {res.title}
                          </span>
                          <span className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-secondary)] uppercase">
                            {res.source_type}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-medium ${
                              res.status === "ready"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            }`}
                          >
                            {res.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-mono">
                          <span>{res.file_name}</span>
                          <span>•</span>
                          <span>{res.page_count} pages extracted</span>
                          <span>•</span>
                          <span className="text-[var(--text-secondary)]">
                            {assignedUnit ? `Unit ${assignedUnit.unit_number}: ${assignedUnit.title}` : "All Units"}
                          </span>
                        </div>
                        {res.error_message && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">{res.error_message}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-3">
                      <button
                        type="button"
                        onClick={() => setViewingResource(res)}
                        aria-label="Inspect extracted pages"
                        className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                        title="View Extracted Pages"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <a
                        href={getDownloadUrl(res.id)}
                        download={res.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                        title="Download Original File"
                      >
                        <Download className="h-4 w-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteResource(res.id)}
                        aria-label="Delete resource"
                        className="rounded p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-subtle)] transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Subject Q&A Chat */}
      {activeTab === "chat" && (
        <SubjectChatTab
          subject={subject}
          units={units}
          resources={resources}
          onOpenViewer={(res) => setViewingResource(res)}
        />
      )}

      {/* Modals */}
      <CreateUnitModal
        isOpen={isUnitModalOpen}
        subjectId={subject.id}
        nextUnitNumber={units.length + 1}
        onClose={() => setIsUnitModalOpen(false)}
        onUnitCreated={(newUnit) => setUnits((prev) => [...prev, newUnit])}
      />

      <UploadResourceModal
        isOpen={isUploadModalOpen}
        subjectId={subject.id}
        units={units}
        onClose={() => setIsUploadModalOpen(false)}
        onResourceUploaded={(newRes) => setResources((prev) => [newRes, ...prev])}
      />

      {viewingResource && (
        <DocumentViewerModal
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
        />
      )}
    </div>
  );
}
