"use client";

import React, { useEffect, useState, useId } from "react";
import {
  Code,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface MermaidDiagramProps {
  code: string;
  diagramType?: string | null;
  caption?: string;
}

export function MermaidDiagram({
  code,
  diagramType,
  caption,
}: MermaidDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/:/g, "")}`;

  useEffect(() => {
    let isCancelled = false;

    async function renderChart() {
      setLoading(true);
      setError(null);

      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        const isDark =
          typeof document !== "undefined" &&
          (document.documentElement.classList.contains("dark") ||
            document.documentElement.getAttribute("data-theme") === "deepseek");

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: isDark ? "dark" : "neutral",
          fontFamily: "inherit",
          fontSize: 12,
        });

        // Clean any residual markdown fences
        const cleaned = code
          .replace(/^```(?:mermaid)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        if (!cleaned) {
          throw new Error("No diagram content provided.");
        }

        const { svg } = await mermaid.render(diagramId, cleaned);
        if (!isCancelled) {
          setSvgHtml(svg);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "Failed to parse Mermaid diagram syntax.";
          setError(msg);
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isCancelled = true;
    };
  }, [code, diagramId]);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`my-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] transition-all overflow-hidden ${
        isExpanded ? "ring-2 ring-[var(--accent-primary)] shadow-lg" : ""
      }`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">
            Visual Explanation
          </span>
          {diagramType && (
            <span className="rounded bg-[var(--bg-surface)] border border-[var(--border-default)] px-1.5 py-0.2 font-mono text-[9px] uppercase text-[var(--text-secondary)]">
              {diagramType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title="Copy Mermaid Code"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span className="text-[10px]">{copied ? "Copied" : "Code"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCode((prev) => !prev)}
            className={`flex items-center gap-1 rounded p-1 transition-colors ${
              showCode
                ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title="Toggle Code View"
          >
            <Code className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title={isExpanded ? "Collapse View" : "Expand View"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Diagram Canvas or Error Fallback */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-xs text-[var(--text-muted)] gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
            <span>Rendering visual diagram...</span>
          </div>
        ) : error ? (
          <div className="space-y-2 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Diagram Rendering Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
              The visual flowchart could not be rendered, but the text explanation above remains completely intact.
            </p>
            <details className="text-[10px] font-mono mt-1 pt-1 border-t border-amber-500/20">
              <summary className="cursor-pointer hover:underline">
                View diagnostic details
              </summary>
              <pre className="mt-1 p-2 rounded bg-black/20 overflow-x-auto whitespace-pre-wrap">
                {error}
              </pre>
            </details>
          </div>
        ) : svgHtml ? (
          <div
            className="flex justify-center overflow-x-auto select-none [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : null}

        {/* Raw Code Accordion */}
        {showCode && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="text-[10px] font-mono text-[var(--text-muted)] mb-1">
              Mermaid Source Code:
            </div>
            <pre className="rounded bg-[var(--code-bg)] p-2.5 font-mono text-[10px] text-[var(--text-primary)] overflow-x-auto whitespace-pre leading-relaxed border border-[var(--border-subtle)]">
              {code}
            </pre>
          </div>
        )}

        {caption && (
          <div className="mt-2 text-center text-[10px] text-[var(--text-muted)] italic">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}

