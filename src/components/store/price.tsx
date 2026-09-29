import { applyLineDiscount, pickHighestSaving } from "@/domain/discount";
import { formatPHP } from "@/domain/money";
import { SAVE_BADGE_CLASS } from "@/components/store/overlay-pill";
import type { VariantDiscount } from "@/domain/variant-options";

interface PriceProps {
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos?: number;
  quantity?: number;
  /** Currently-active discount candidates for this variant (unreduced), so a
   *  quantity greater than 1 re-picks the winner and recomputes the true
   *  line total instead of naively multiplying the quantity-1 preview. A
   *  FIXED discount is a flat amount off the whole line (applyLineDiscount),
   *  not an even per-unit split, and which discount wins can itself change
   *  with quantity (a capped FIXED amount vs. a linearly-scaling
   *  PERCENTAGE) — see VariantDiscount's doc comment. Every value already
   *  known to reflect the final line total for its quantity (a past order's
   *  stored totals, or any quantity=1 display) can safely omit this. */
  discounts?: VariantDiscount[];
  suffix?: string;
  className?: string;
  /** False when the caller shows "Save X%" elsewhere (e.g. on the photo). */
  showSaveBadge?: boolean;
}

export function Price({
  originalCentavos,
  discountedCentavos,
  savedCentavos = Math.max(0, originalCentavos - discountedCentavos),
  quantity = 1,
  discounts = [],
  suffix,
  className,
  showSaveBadge = true,
}: PriceProps) {
  const winner = pickHighestSaving(discounts, originalCentavos, quantity);
  const line = winner ? applyLineDiscount(originalCentavos, quantity, winner) : null;
  const nowCentavos = line ? line.lineSubtotalCentavos : discountedCentavos * quantity;
  const totalSavedCentavos = line ? line.lineDiscountCentavos : savedCentavos * quantity;
  const originalTotalCentavos = originalCentavos * quantity;
  const hasDiscount = totalSavedCentavos > 0 && nowCentavos < originalTotalCentavos;
  const percent =
    originalTotalCentavos > 0 ? Math.round((totalSavedCentavos / originalTotalCentavos) * 100) : 0;
  if (!hasDiscount) {
    return (
      <span className={className}>
        <span className="font-price-display text-2xl tracking-tight">{formatPHP(nowCentavos)}</span>
        {suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-price-display text-2xl tracking-tight">
          {/* sr-only text, not aria-label: screen readers ignore a label on a plain span. */}
          <span className="sr-only">Now </span>
          {formatPHP(nowCentavos)}
        </span>
        <s className="text-sm text-muted-foreground">
          <span className="sr-only">Original price</span>
          {formatPHP(originalTotalCentavos)}
        </s>
        {showSaveBadge ? (
          <span className={SAVE_BADGE_CLASS}>
            {percent > 0 ? `Save ${percent}%` : `Save ${formatPHP(totalSavedCentavos)}`}
          </span>
        ) : null}
      </span>
      {suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

export function CatalogPrice({
  minOriginalCentavos,
  minDiscountedCentavos,
  maxDiscountedCentavos,
  savePercent,
  align = "left",
  showSaveBadge = true,
}: {
  minOriginalCentavos: number;
  minDiscountedCentavos: number;
  maxDiscountedCentavos: number;
  savePercent: number | null;
  align?: "left" | "right";
  showSaveBadge?: boolean;
}) {
  // One price, not a range: the cheapest option, prefixed "From" when other
  // sizes/options cost more. The struck original pairs with that cheapest
  // price, the same pairing the card's "Save X%" badge is computed from.
  const hasMoreOptions = minDiscountedCentavos !== maxDiscountedCentavos;
  const fromIsDiscounted = minDiscountedCentavos < minOriginalCentavos;
  const rowJustify = align === "right" ? "justify-end" : "justify-start";
  // One wrapping row: the struck original sits to the LEFT of the price
  // when the card has room, and wraps onto its own line ABOVE it when it
  // doesn't (flex-wrap keeps DOM order, so the first item stays on top).
  // Card content width (measured): ~130px on a two-column phone, ~230px+
  // in the 576-767px tier, ~190px from md up — so the price is text-lg
  // except text-2xl in that roomy middle tier. Each item is nowrap; the row
  // wraps between them instead of breaking a price in half.
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${rowJustify}`}>
      {fromIsDiscounted ? (
        <>
          <s className="whitespace-nowrap text-[11px] text-muted-foreground min-[576px]:text-xs">
            <span className="sr-only">Original price </span>
            {formatPHP(minOriginalCentavos)}
          </s>
          {showSaveBadge && savePercent && savePercent > 0 ? (
            <span className={SAVE_BADGE_CLASS}>Save {savePercent}%</span>
          ) : null}
        </>
      ) : null}
      <p className="whitespace-nowrap font-price-display text-lg leading-none tracking-tight min-[576px]:text-2xl md:text-lg">
        {fromIsDiscounted ? <span className="sr-only">Now </span> : null}
        {hasMoreOptions ? (
          <span className="mr-1 font-sans text-[11px] tracking-normal text-muted-foreground">From</span>
        ) : null}
        {formatPHP(minDiscountedCentavos)}
      </p>
    </div>
  );
}
