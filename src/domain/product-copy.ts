import type { ProductType } from "@/db/schema";

/**
 * The form's gender value for whatever the product row holds. Fragrantica
 * imports store the site's own wording ("for women", "Women and men"), while
 * the form and upsertProduct only take men / women / unisex.
 */
export function formGender(gender: string | null | undefined): "men" | "women" | "unisex" | "" {
  const value = (gender ?? "").trim().toLowerCase();
  if (!value) return "";
  const women = /\bwom[ae]n\b|female|\bher\b/.test(value);
  const men = /\bm[ae]n\b|male|\bhim\b/.test(value.replace(/wom[ae]n/g, "").replace(/female/g, ""));
  if (value.includes("unisex") || (women && men)) return "unisex";
  if (women) return "women";
  if (men) return "men";
  return "";
}

/** The notes text for a product: its own, or one built from its note pyramid (the way imports write it). */
export function notesText(
  notes: string | null,
  pyramid: { top: string[]; middle: string[]; base: string[] } | null,
): string {
  if (notes?.trim()) return notes.trim();
  if (!pyramid) return "";
  return [
    pyramid.top.length ? `Top: ${pyramid.top.join(", ")}` : null,
    pyramid.middle.length ? `Middle: ${pyramid.middle.join(", ")}` : null,
    pyramid.base.length ? `Base: ${pyramid.base.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export const PRODUCT_TYPES_FOR_FORM: ReadonlyArray<{ value: ProductType; label: string }> = [
  { value: "DECANT", label: "Decant" },
  { value: "FULL_BOTTLE", label: "Full bottle" },
  { value: "PARTIAL", label: "Partial" },
];
