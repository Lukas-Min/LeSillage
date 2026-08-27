export type ProductAccords = Array<{ name: string; strength?: number; color?: string | null }>;

export function productAccords(value: unknown): ProductAccords {
  if (!Array.isArray(value)) return [];
  const out: ProductAccords = [];
  for (const entry of value) {
    if (entry && typeof entry === "object" && "name" in entry) {
      const name = String((entry as { name: unknown }).name ?? "").trim();
      if (!name) continue;
      const strengthRaw = (entry as { strength?: unknown }).strength;
      const strength = typeof strengthRaw === "number" ? strengthRaw : undefined;
      const colorRaw = (entry as { color?: unknown }).color;
      const color = typeof colorRaw === "string" ? colorRaw : null;
      out.push({ name, strength, color });
    }
  }
  return out;
}
