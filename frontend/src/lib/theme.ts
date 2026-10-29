export type ThemeId = "monochrome" | "claude" | "gemini" | "deepseek" | "kimi";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  badge: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "monochrome",
    name: "Minimal Monochrome",
    description: "Pure neutral black, white, and subtle grays. Calm and distraction-free.",
    badge: "Default",
  },
  {
    id: "claude",
    name: "Warm Editorial",
    description: "Parchment tone with terracotta accents inspired by literary and research workspaces.",
    badge: "Warm",
  },
  {
    id: "gemini",
    name: "Cool Indigo",
    description: "Crisp slate and clean indigo accents designed for technical precision.",
    badge: "Cool",
  },
  {
    id: "deepseek",
    name: "Midnight Slate",
    description: "High-contrast dark navy canvas with electric blue accents for focused study.",
    badge: "Dark",
  },
  {
    id: "kimi",
    name: "Clean Mint",
    description: "Airy light parchment with understated teal accents for prolonged reading.",
    badge: "Light",
  },
];

export const THEME_STORAGE_KEY = "afg_theme_preference";
export const DEFAULT_THEME: ThemeId = "monochrome";

