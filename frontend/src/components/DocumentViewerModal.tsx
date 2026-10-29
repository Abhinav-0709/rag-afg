"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  AlertTriangle,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  AcademicResource,
  DocumentPagesList,
  fetchDocumentPages,
  getDownloadUrl,
} from "@/lib/api";

interface DocumentViewerModalProps {
  resource: AcademicResource;
  onClose: () => void;
}

export function DocumentViewerModal({
  resource,
  onClose,
}: DocumentViewerModalProps) {
  const [pagesData, setPagesData] = useState<DocumentPagesList | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchDocumentPages(resource.id)
      .then((data) => {
        if (!ignore) {
          setPagesData(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load document pages");
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
  }, [resource.id]);

  const currentPage = pagesData?.pages[selectedPageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-viewer-title"
        className="flex flex-col h-[85vh] w-full max-w-4xl rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] shadow-2xl text-xs overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="doc-viewer-title" className="font-semibold text-sm text-[var(--text-primary)]">
                  {resource.title}
                </h3>
                <span className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-secondary)] uppercase">
                  {resource.source_type}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                    resource.status === "ready"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  }`}
                >
                  {resource.status.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                {resource.file_name} • {(resource.file_size_bytes / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getDownloadUrl(resource.id)}
              download={resource.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Original</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Warning / Extraction Banner */}
        {resource.error_message && (
          <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-2.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{resource.error_message}</span>
          </div>
        )}

        {/* Body content with page navigation */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Page list selector */}
          <div className="w-56 border-r border-[var(--border-default)] bg-[var(--bg-surface)] p-3 overflow-y-auto space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Document Pages ({pagesData?.page_count || 0})
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-6 text-[11px] text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading pages...</span>
              </div>
            ) : !pagesData?.pages || pagesData.pages.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-[var(--text-muted)]">
                No extracted text found.
              </div>
            ) : (
              pagesData.pages.map((p, idx) => {
                const isSelected = selectedPageIndex === idx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[var(--bg-surface-elevated)] font-semibold text-[var(--text-primary)] border border-[var(--border-active)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>Page {p.page_number}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {p.char_count} chars
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Page content view */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-canvas)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--text-muted)] gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading document text...</span>
              </div>
            ) : error ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : !currentPage ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--text-muted)] gap-2">
                <BookOpen className="h-6 w-6" />
                <span>No page content available for preview.</span>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Extracted Text — Page {currentPage.page_number}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    {currentPage.char_count} characters
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--code-bg)] p-4 font-mono text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap select-text">
                  {currentPage.content || (
                    <span className="text-[var(--text-muted)] italic">
                      [Blank page or non-textual graphic content]
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

