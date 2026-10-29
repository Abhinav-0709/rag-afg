"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { uploadAcademicFile, AcademicResource, SourceType, SyllabusUnit } from "@/lib/api";

interface UploadResourceModalProps {
  isOpen: boolean;
  subjectId: string;
  units: SyllabusUnit[];
  onClose: () => void;
  onResourceUploaded: (resource: AcademicResource) => void;
}

export function UploadResourceModal({
  isOpen,
  subjectId,
  units,
  onClose,
  onResourceUploaded,
}: UploadResourceModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("notes");
  const [unitId, setUnitId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(file: File) {
    setSelectedFile(file);
    if (!title) {
      // Auto fill title from filename without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(nameWithoutExt);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a document or file to upload");
      return;
    }
    if (!title.trim()) {
      setError("Resource title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("source_type", sourceType);
      if (unitId) {
        formData.append("unit_id", unitId);
      }

      const newResource = await uploadAcademicFile(subjectId, formData);
      onResourceUploaded(newResource);
      setSelectedFile(null);
      setTitle("");
      setUnitId("");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload and extract document");
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
        aria-labelledby="upload-modal-title"
        className="w-full max-w-lg rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-5 shadow-lg space-y-4 text-xs"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)]">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="upload-modal-title"
                className="font-semibold text-sm text-[var(--text-primary)]"
              >
                Upload Academic Document
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Files are stored and extracted with page-level metadata.
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
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Drag & drop file dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-canvas)] p-6 text-center cursor-pointer hover:border-[var(--border-active)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
                <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                <span className="truncate max-w-xs">{selectedFile.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-1" />
              </div>
            ) : (
              <div className="space-y-1">
                <UploadCloud className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-1" />
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  Click or drag and drop document here
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Supported formats: PDF, DOCX, TXT, PNG, JPG (Max 50MB)
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Resource Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures and Algorithms in C++ (4th Ed)"
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
              disabled={loading || !selectedFile}
              className="flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3.5 py-1.5 font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{loading ? "Extracting Content..." : "Upload & Extract"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

