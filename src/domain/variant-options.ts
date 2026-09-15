import type { Condition, Fulfillment, Packaging, Provenance } from "@/db/schema";

/**
 * Shared shapes + pure logic for the size/provenance variant picker
 * (SizePicker, src/components/store/size-picker.tsx). Deliberately NOT in
 * that file: it carries "use client", and any real function exported from a
 * "use client" module becomes a client reference — a Server Component
 * (e.g. the PDP) cannot call it directly, only render it as JSX. This
 * module has no "use client" and no server-only imports, so both server
 * pages and client components can import findSelectedVariant safely.
 */

/** One condition/packaging variant within a size+provenance group — only
 *  meaningful when a group has more than one of these (see SizePickerOption
 *  below); a group with just one SKU has no subOptions at all. */
export interface VariantSubOption {
  skuId: string;
  label: string;
  condition: Condition;
  packaging: Packaging;
  fulfillment: Fulfillment;
  soldOut?: boolean;
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos: number;
}

/** One size+provenance group — never a placeholder for a size/provenance the product doesn't offer. */
export interface SizePickerOption {
  sizeMl: number;
  /** "{sizeMl}ML", or "{sizeMl}ML · {provenance label}" when the provenance
   *  is worth naming — In-house (a decant poured to order from a bottle we
   *  own) is the implied default and never shown; Retail (a decant bought
   *  pre-made, with its own stock) and Tester (a full-bottle/partial bought
   *  as tester stock) both are. See sizePickerGroupLabel in lib/catalog.ts. */
  label: string;
  /** The default SKU for this group (first available one, or the group's
   *  only one) — what gets added to cart if the customer never opens the
   *  secondary condition/packaging picker below. */
  skuId: string;
  fulfillment: Fulfillment;
  condition?: Condition;
  packaging?: Packaging;
  provenance?: Provenance;
  soldOut?: boolean;
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos: number;
  /** Only present (length > 1) when this size+provenance has more than one
   *  SKU differing by condition/packaging — a secondary picker renders below
   *  the size row so the customer can refine within the group. Never shown
   *  otherwise ("only if available for that"). */
  subOptions?: VariantSubOption[];
}

/** Smallest size first, then A–Z by label (numeric so 3ml sorts before 10ml). */
export function compareSkuOrder(
  a: { sizeMl?: number | null; label: string },
  b: { sizeMl?: number | null; label: string },
): number {
  const sizeA = a.sizeMl ?? Number.POSITIVE_INFINITY;
  const sizeB = b.sizeMl ?? Number.POSITIVE_INFINITY;
  if (sizeA !== sizeB) return sizeA - sizeB;
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Resolves whichever leaf skuId is currently selected — a top-level group's
 * own skuId, or one of its subOptions' — into one flat SizePickerOption
 * shape for display (price, fulfillment, condition, packaging), regardless
 * of which tier it came from. Every consumer should read the "currently
 * selected variant" through this instead of a plain
 * `options.find(o => o.skuId === selectedSkuId)`, which would miss a
 * selection that landed on a subOption.
 */
export function findSelectedVariant(
  options: SizePickerOption[],
  selectedSkuId: string | null,
): SizePickerOption | null {
  if (!selectedSkuId) return null;
  for (const group of options) {
    if (group.skuId === selectedSkuId) return group;
    const sub = group.subOptions?.find((s) => s.skuId === selectedSkuId);
    if (sub) {
      return {
        ...group,
        skuId: sub.skuId,
        condition: sub.condition,
        packaging: sub.packaging,
        fulfillment: sub.fulfillment,
        soldOut: sub.soldOut,
        originalCentavos: sub.originalCentavos,
        discountedCentavos: sub.discountedCentavos,
        savedCentavos: sub.savedCentavos,
      };
    }
  }
  return null;
}
