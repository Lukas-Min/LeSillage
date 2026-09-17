import { applyLineDiscount, pickHighestSaving } from "@/domain/discount";
import { formatPHP, formatPHPRange } from "@/domain/money";
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
}

export function Price({
  originalCentavos,
  discountedCentavos,
  savedCentavos = Math.max(0, originalCentavos - discountedCentavos),
  quantity = 1,
  discounts = [],
  suffix,
  className,
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
        <span className="font-serif-display text-2xl tracking-tight">{formatPHP(nowCentavos)}</span>
        {suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-serif-display text-2xl tracking-tight" aria-label="Now">
          {formatPHP(nowCentavos)}
        </span>
        <s className="text-sm text-muted-foreground">
          <span className="sr-only">Original price</span>
          {formatPHP(originalTotalCentavos)}
        </s>
        <span className="inline-flex items-center rounded-none border border-gold/30 bg-gold/15 px-2.5 py-1 text-[13px] font-medium text-gold">
          {percent > 0 ? `Save ${percent}%` : `Save ${formatPHP(totalSavedCentavos)}`}
        </span>
      </span>
      {suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

export function CatalogPrice({
  minOriginalCentavos,
  maxOriginalCentavos,
  minDiscountedCentavos,
  maxDiscountedCentavos,
  savePercent,
  align = "left",
  showSaveBadge = true,
}: {
  minOriginalCentavos: number;
  maxOriginalCentavos: number;
  minDiscountedCentavos: number;
  maxDiscountedCentavos: number;
  savePercent: number | null;
  align?: "left" | "right";
  showSaveBadge?: boolean;
}) {
  const hasDiscount =
    minDiscountedCentavos < minOriginalCentavos || maxDiscountedCentavos < maxOriginalCentavos;
  const alignClass = align === "right" ? "text-right" : "text-left";
  const rowJustify = align === "right" ? "justify-end" : "justify-start";
  return (
    <div className={`space-y-1 ${alignClass}`}>
      {hasDiscount ? (
        <p className={`flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${rowJustify}`}>
          <s>{formatPHPRange(minOriginalCentavos, maxOriginalCentavos)}</s>
          {showSaveBadge && savePercent && savePercent > 0 ? (
            <span className="inline-flex items-center rounded-none border border-gold/30 bg-gold/15 px-2.5 py-1 text-[13px] font-medium text-gold">
              Save {savePercent}%
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="font-serif-display text-2xl leading-none tracking-tight">
        {formatPHPRange(minDiscountedCentavos, maxDiscountedCentavos)}
      </p>
    </div>
  );
}
