"use client";

import React, { useState } from "react";
import { X, FilePlus, Loader2 } from "lucide-react";
import { createResource, AcademicResource, SourceType, SyllabusUnit } from "@/lib/api";

interface CreateResourceModalProps {
  isOpen: boolean;
  subjectId: string;
  units: SyllabusUnit[];
  onClose: () => void;
  onResourceCreated: (resource: AcademicResource) => void;
}

export function CreateResourceModal({
  isOpen,
  subjectId,
  units,
  onClose,
  onResourceCreated,
}: CreateResourceModalProps) {
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("notes");
  const [fileName, setFileName] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!fileName.trim()) {
      setError("File name is required");
      return;
    }

    const fileType = fileName.split(".").pop()?.toLowerCase() || "pdf";

    try {
      setLoading(true);
      setError(null);
      const newRes = await createResource({
        subject_id: subjectId,
        unit_id: unitId ? unitId : null,
        title: title.trim(),
        source_type: sourceType,
        file_name: fileName.trim(),
        file_type: fileType,
        file_size_bytes: 1024 * 1024, // baseline default for record
      });
      onResourceCreated(newRes);
      setTitle("");
      setFileName("");
      setUnitId("");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create academic resource record");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-resource-title"
        className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-5 shadow-lg space-y-4 text-xs"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)]">
              <FilePlus className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="create-resource-title"
                className="font-semibold text-sm text-[var(--text-primary)]"
              >
                Add Academic Resource Record
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Register a textbook, notes, or previous question paper.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Resource Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Introduction to Algorithms (CLRS) - Chapter 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-primary)] mb-1">
                Source Type <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              >
                <option value="textbook">Textbook</option>
                <option value="notes">Lecture Notes</option>
                <option value="syllabus">Syllabus</option>
                <option value="question_paper">Question Paper</option>
                <option value="other">Other Document</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--text-primary)] mb-1">
                Associated Syllabus Unit
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              >
                <option value="">General / Entire Course</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number}: {u.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              File Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. clrs_ch4_divide_and_conquer.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded px-3 py-1.5 font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3.5 py-1.5 font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>Save Resource</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

