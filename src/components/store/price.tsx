import { formatPHP, formatPHPRange } from "@/domain/money";

interface PriceProps {
  originalCentavos: number;
  discountedCentavos: number;
  savedCentavos?: number;
  quantity?: number;
  suffix?: string;
  className?: string;
}

export function Price({
  originalCentavos,
  discountedCentavos,
  savedCentavos = Math.max(0, originalCentavos - discountedCentavos),
  quantity = 1,
  suffix,
  className,
}: PriceProps) {
  const hasDiscount = savedCentavos > 0 && discountedCentavos < originalCentavos;
  const percent =
    originalCentavos > 0 ? Math.round((savedCentavos / originalCentavos) * 100) : 0;
  if (!hasDiscount) {
    return (
      <span className={className} aria-label={suffix ?? undefined}>
        <span className="font-serif-display text-2xl tracking-tight">
          {formatPHP(discountedCentavos * quantity)}
        </span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-serif-display text-2xl tracking-tight" aria-label="Now">
          {formatPHP(discountedCentavos * quantity)}
        </span>
        <s className="text-sm text-muted-foreground">
          <span className="sr-only">Original price</span>
          {formatPHP(originalCentavos)}
        </s>
        <span className="inline-flex items-center rounded-none bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">
          {percent > 0 ? `Save ${percent}%` : `Save ${formatPHP(savedCentavos)}`}
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
            <span className="inline-flex items-center rounded-none bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">
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
