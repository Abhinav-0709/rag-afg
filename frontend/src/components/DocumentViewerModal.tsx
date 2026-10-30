"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  AlertTriangle,
  Loader2,
  BookOpen,
  MapPin,
  Highlighter,
} from "lucide-react";
import {
  AcademicResource,
  DocumentPagesList,
  fetchDocumentPages,
  getDownloadUrl,
} from "@/lib/api";

interface DocumentViewerModalProps {
  resource: AcademicResource;
  initialPageNumber?: number;
  highlightSnippet?: string;
  onClose: () => void;
}

function renderHighlightedText(content: string, snippet?: string | null) {
  if (!snippet) return content;
  const cleanSnippet = snippet.replace(/^\.\.\.|\.\.\.$/g, "").trim();
  if (!cleanSnippet || cleanSnippet.length < 3) return content;

  // Exact or near substring match
  const lowerContent = content.toLowerCase();
  const lowerSnippet = cleanSnippet.toLowerCase();
  const pos = lowerContent.indexOf(lowerSnippet);

  if (pos !== -1) {
    const before = content.slice(0, pos);
    const match = content.slice(pos, pos + cleanSnippet.length);
    const after = content.slice(pos + cleanSnippet.length);
    return (
      <>
        {before}
        <mark className="rounded bg-amber-300/80 dark:bg-amber-400/30 text-[var(--text-primary)] px-1 py-0.5 font-semibold ring-1 ring-amber-500/40">
          {match}
        </mark>
        {after}
      </>
    );
  }

  // Token fallback for broken whitespace or multiline chunks
  const words = cleanSnippet
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter((w) => w.length >= 4);

  if (words.length === 0) return content;

  const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`\\b(${escapedWords.join("|")})\\b`, "gi");
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = words.some((w) => w.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark
              key={idx}
              className="rounded bg-amber-300/80 dark:bg-amber-400/30 text-[var(--text-primary)] px-0.5 font-semibold"
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}

export function DocumentViewerModal({
  resource,
  initialPageNumber,
  highlightSnippet,
  onClose,
}: DocumentViewerModalProps) {
  const [pagesData, setPagesData] = useState<DocumentPagesList | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [activeSnippet, setActiveSnippet] = useState<string | null>(highlightSnippet || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchDocumentPages(resource.id)
      .then((data) => {
        if (!ignore) {
          setPagesData(data);
          setError(null);
          if (initialPageNumber && data.pages.length > 0) {
            const foundIdx = data.pages.findIndex(
              (p) => p.page_number === initialPageNumber
            );
            if (foundIdx !== -1) {
              setSelectedPageIndex(foundIdx);
            }
          }
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
  }, [resource.id, initialPageNumber]);

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

        {/* Citation Navigation Banner */}
        {initialPageNumber && (
          <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[11px] text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Navigated directly to cited location: <strong>Page {currentPage?.page_number || initialPageNumber}</strong>
              </span>
              {activeSnippet && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-amber-700 dark:text-amber-300/80">
                  <Highlighter className="h-3 w-3" />
                  <span>Snippet highlighted</span>
                </span>
              )}
            </div>

            {activeSnippet && (
              <button
                type="button"
                onClick={() => setActiveSnippet(null)}
                className="rounded px-2 py-0.5 text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                Clear Highlight
              </button>
            )}
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
                const isCitedPage = initialPageNumber === p.page_number;

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
                    <div className="flex items-center gap-1.5">
                      {isCitedPage && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" title="Cited Page" />
                      )}
                      <span>Page {p.page_number}</span>
                    </div>
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Extracted Text — Page {currentPage.page_number}
                    </span>
                    {initialPageNumber === currentPage.page_number && (
                      <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                        CITED PAGE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    {currentPage.char_count} characters
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--code-bg)] p-4 font-mono text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap select-text">
                  {currentPage.content ? (
                    renderHighlightedText(currentPage.content, activeSnippet)
                  ) : (
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

