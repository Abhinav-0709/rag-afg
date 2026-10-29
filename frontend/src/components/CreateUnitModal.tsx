"use client";

import React, { useState } from "react";
import { X, Layers, Loader2 } from "lucide-react";
import { createUnit, SyllabusUnit } from "@/lib/api";

interface CreateUnitModalProps {
  isOpen: boolean;
  subjectId: string;
  nextUnitNumber: number;
  onClose: () => void;
  onUnitCreated: (unit: SyllabusUnit) => void;
}

export function CreateUnitModal({
  isOpen,
  subjectId,
  nextUnitNumber,
  onClose,
  onUnitCreated,
}: CreateUnitModalProps) {
  const [unitNumber, setUnitNumber] = useState(nextUnitNumber);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Unit title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newUnit = await createUnit(subjectId, {
        unit_number: unitNumber,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      onUnitCreated(newUnit);
      setTitle("");
      setDescription("");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create syllabus unit");
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
        aria-labelledby="create-unit-title"
        className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-5 shadow-lg space-y-4 text-xs"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="create-unit-title"
                className="font-semibold text-sm text-[var(--text-primary)]"
              >
                Add Syllabus Unit
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Define the curriculum modules or syllabus topics.
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
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block font-medium text-[var(--text-primary)] mb-1">
                Unit #
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={unitNumber}
                onChange={(e) => setUnitNumber(parseInt(e.target.value) || 1)}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-medium text-[var(--text-primary)] mb-1">
                Unit Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Trees and Binary Search Trees"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1">
              Syllabus Topics & Key Concepts
            </label>
            <textarea
              rows={3}
              placeholder="e.g. BST insertion, deletion, AVL rotations, Red-Black properties..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] resize-none"
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
              <span>Save Unit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

