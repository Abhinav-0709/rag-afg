"use client";

import React, { useState } from "react";
import {
  Subject,
  SyllabusUnit,
  AcademicResource,
  RAGQueryResponse,
  AnswerMode,
  AnswerFormat,
  queryAcademicRAG,
} from "@/lib/api";
import {
  Send,
  Loader2,
  ShieldCheck,
  BookOpen,
  Sparkles,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface SubjectChatTabProps {
  subject: Subject;
  units: SyllabusUnit[];
  resources: AcademicResource[];
  onOpenViewer: (resource: AcademicResource) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  responseMeta?: RAGQueryResponse;
}

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

export function SubjectChatTab({
  subject,
  units,
  resources,
  onOpenViewer,
}: SubjectChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [mode, setMode] = useState<AnswerMode>("source_only");
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat>("detailed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  const samplePrompts = [
    "Explain the fundamental concepts in this course",
    "Summarize the key definitions and formulas",
    "Explain the main algorithm step-by-step",
    "What are the most important topics covered?",
  ];

  async function handleSend(queryText?: string) {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: createMessageId("user"),
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);
    setError(null);

    try {
      const res = await queryAcademicRAG({
        query: textToSend,
        subject_id: subject.id,
        unit_id: selectedUnitId ? selectedUnitId : undefined,
        mode,
        answer_format: answerFormat,
      });

      const assistantMsg: ChatMessage = {
        id: createMessageId("assistant"),
        sender: "assistant",
        text: res.answer,
        responseMeta: res,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to generate answer. Ensure the backend is reachable.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[75vh] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden text-xs">
      {/* Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] p-3 bg-[var(--bg-surface-elevated)]">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-[var(--text-primary)]">
              Academic Q&amp;A — {subject.name}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono">
              {resources.length} uploaded files • Isolated Context
            </div>
          </div>
        </div>

        {/* Options & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grounding Mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
              Mode:
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as AnswerMode)}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-focus)]"
            >
              <option value="source_only">Uploaded Materials Only</option>
              <option value="combine_sources">Synthesize Multiple Sources</option>
              <option value="general">General AI Explanation</option>
            </select>
          </div>

          {/* Answer Format */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
              Format:
            </span>
            <select
              value={answerFormat}
              onChange={(e) => setAnswerFormat(e.target.value as AnswerFormat)}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-focus)]"
            >
              <option value="detailed">Detailed Academic</option>
              <option value="short">Short Summary</option>
              <option value="2_mark">2-Mark Answer</option>
              <option value="5_mark">5-Mark Question</option>
              <option value="10_mark">10-Mark Comprehensive</option>
              <option value="step_by_step">Step-by-Step</option>
            </select>
          </div>

          {/* Syllabus Unit Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
              Unit:
            </span>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-focus)] max-w-[140px] truncate"
            >
              <option value="">All Units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unit_number}: {u.title}
                </option>
              ))}
            </select>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Clear Conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--accent-primary)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                Ask Questions Grounded in {subject.name}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                The academic RAG engine searches your uploaded notes, textbooks, and syllabus units. Answers include verifiable page citations.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-lg">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="rounded-full border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-2xl rounded-lg p-3.5 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-foreground)]"
                    : "border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
                }`}
              >
                {/* Assistant status badge */}
                {msg.sender === "assistant" && msg.responseMeta && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 mb-2 text-[10px]">
                    <div className="flex items-center gap-1.5 font-medium">
                      {msg.responseMeta.grounded ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Source Grounded
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" /> Insufficient Evidence
                        </span>
                      )}
                      <span>•</span>
                      <span className="text-[var(--text-muted)] font-mono">
                        {msg.responseMeta.retrieved_count} sources cited
                      </span>
                    </div>

                    <span className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-secondary)] uppercase">
                      {msg.responseMeta.format_used}
                    </span>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Citations Panel */}
                {msg.responseMeta && msg.responseMeta.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span>Traceable Sources &amp; Citations</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {msg.responseMeta.citations.map((c) => {
                        const isExpanded = expandedCitationId === c.chunk_id;
                        const matchingRes = resources.find((r) => r.id === c.resource_id);

                        return (
                          <div
                            key={c.chunk_id}
                            className="rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] p-2 text-[11px] transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {c.document_title}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                  Page {c.page_number}
                                </span>
                                <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-1 py-0.1 font-mono text-[9px] text-[var(--text-secondary)] uppercase">
                                  {c.source_type}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {matchingRes && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenViewer(matchingRes)}
                                    className="text-[10px] text-[var(--accent-primary)] hover:underline flex items-center gap-0.5"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span>Open Document</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCitationId(isExpanded ? null : c.chunk_id)
                                  }
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Excerpt */}
                            {isExpanded && (
                              <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)] leading-relaxed italic bg-[var(--code-bg)] p-2 rounded">
                                &ldquo;{c.excerpt}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
            <span>Retrieving academic passages &amp; generating grounded answer...</span>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <div className="border-t border-[var(--border-default)] p-3 bg-[var(--bg-surface-elevated)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question grounded in ${subject.name}...`}
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring-focus)]"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-primary)] px-3.5 py-2 font-medium text-xs text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}

