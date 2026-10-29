"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/theme";
import { Palette, Check, ChevronDown } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select theme"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] transition-colors"
      >
        <Palette className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <span>{currentTheme.name}</span>
        <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1.5 w-64 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-1 shadow-md z-50 text-xs"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            Appearance & Workspace Theme
          </div>
          {THEMES.map((opt) => {
            const isSelected = opt.id === theme;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 transition-colors ${
                  isSelected
                    ? "bg-[var(--bg-subtle)] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[var(--text-primary)]">{opt.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-[var(--border-default)] text-[var(--text-muted)]">
                      {opt.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    {opt.description}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 mt-0.5 text-[var(--accent-primary)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

