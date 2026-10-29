"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FolderKanban,
  FileText,
  Menu,
  X,
  Plus,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "resources" | "papers">("overview");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* Mobile sidebar overlay backdrop */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] transition-transform duration-200 ease-in-out sm:static sm:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-0 sm:translate-x-0 max-sm:-translate-x-full"
        }`}
      >
        {/* Brand / Workspace header */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--border-default)] px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border-active)] bg-[var(--bg-surface-elevated)] font-mono text-xs font-bold text-[var(--text-primary)]">
              AFG
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight text-[var(--text-primary)]">
                Academic Assistant
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                RAG Workspace v0.1
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace Quick Actions */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("subjects");
              setMobileMenuOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <span>New Subject Workspace</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Workspace
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Compass className="h-4 w-4 shrink-0" />
            <span>Workspace Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("subjects");
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium transition-colors ${
              activeTab === "subjects"
                ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>Subject Workspaces</span>
            <span className="ml-auto rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("resources");
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium transition-colors ${
              activeTab === "resources"
                ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Academic Resources</span>
            <span className="ml-auto rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("papers");
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium transition-colors ${
              activeTab === "papers"
                ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Previous Exam Papers</span>
            <span className="ml-auto rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              0
            </span>
          </button>
        </nav>

        {/* Verification Status & Theme selector footer */}
        <div className="border-t border-[var(--border-default)] p-3 space-y-3 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <span>Mode: Source Grounded</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Theme</span>
            <ThemeSelector />
          </div>
        </div>
      </aside>

      {/* Main workspace container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] sm:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Workspace</span>
              <span className="text-[var(--text-muted)]">/</span>
              <span className="font-medium text-[var(--text-primary)] capitalize">
                {activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border-default)] px-2.5 py-1 rounded bg-[var(--bg-canvas)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Academic RAG Engine Ready</span>
            </div>
          </div>
        </header>

        {/* Main scrollable body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

