export type NotePyramid = { top: string[]; middle: string[]; base: string[] };

export function normaliseNotePyramid(value: unknown, fallbackNotes?: string | null): NotePyramid | null {
  if (value && typeof value === "object") {
    const top = pickNotes((value as { top?: unknown }).top);
    const middle = pickNotes((value as { middle?: unknown }).middle);
    const base = pickNotes((value as { base?: unknown }).base);
    if (top.length + middle.length + base.length > 0) return { top, middle, base };
  }
  if (fallbackNotes && fallbackNotes.trim().length > 0) {
    const parts = fallbackNotes
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return { top: parts, middle: [], base: [] };
  }
  return null;
}

function pickNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}
