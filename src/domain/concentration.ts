import type { Concentration } from "@/db/schema";

export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  EAU_DE_COLOGNE: "Eau de Cologne",
  EAU_DE_TOILETTE: "Eau de Toilette",
  EAU_DE_PARFUM: "Eau de Parfum",
  PARFUM: "Parfum",
  EXTRAIT_DE_PARFUM: "Extrait de Parfum",
};

export function concentrationLabel(value: Concentration | null | undefined): string | null {
  if (!value) return null;
  return CONCENTRATION_LABELS[value] ?? null;
}

/** Best-effort guess from free-text (e.g. a sku label like "100ml Eau de Parfum"). */
export function guessConcentration(text: string | null | undefined): Concentration | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("extrait")) return "EXTRAIT_DE_PARFUM";
  if (lower.includes("eau de parfum") || /\bedp\b/.test(lower)) return "EAU_DE_PARFUM";
  if (lower.includes("eau de toilette") || /\bedt\b/.test(lower)) return "EAU_DE_TOILETTE";
  if (lower.includes("eau de cologne") || /\bedc\b/.test(lower)) return "EAU_DE_COLOGNE";
  if (lower.includes("parfum")) return "PARFUM";
  return null;
}

/** Strips a leading concentration phrase out of a sku label, leaving just the size, e.g. "100ml Eau de Parfum" -> "100ml". */
export function sizeOnlyLabel(label: string): string {
  return label
    .replace(/\b(extrait de parfum|eau de parfum|eau de toilette|eau de cologne|parfum|edp|edt|edc)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
