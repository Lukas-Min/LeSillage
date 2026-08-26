import { formatPHP } from "@/domain/money";

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
  if (!hasDiscount) {
    return (
      <span className={className} aria-label={suffix ?? undefined}>
        {formatPHP(discountedCentavos * quantity)}
      </span>
    );
  }
  const percent =
    originalCentavos > 0
      ? Math.round((savedCentavos / originalCentavos) * 100)
      : 0;
  return (
    <span className={className}>
      <span className="flex items-baseline gap-2">
        <s className="text-xs text-muted-foreground">
          <span className="sr-only">Original price</span>
          {formatPHP(originalCentavos)}
        </s>
        <span className="font-medium" aria-label="Now">
          {formatPHP(discountedCentavos * quantity)}
        </span>
      </span>
      <span className="ml-2 inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold-foreground">
        {percent > 0 ? `Save ${percent}%` : `Save ${formatPHP(savedCentavos)}`}
      </span>
      {suffix ? (
        <span className="ml-2 text-xs text-muted-foreground">{suffix}</span>
      ) : null}
    </span>
  );
}
