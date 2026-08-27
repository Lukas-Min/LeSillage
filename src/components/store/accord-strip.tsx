import type { ProductAccords } from "@/lib/product-accords";

export function AccordStrip({ accords }: { accords: ProductAccords | null }) {
  if (!accords || accords.length === 0) {
    return (
      <div className="space-y-2">
        <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          No accord data yet
        </p>
      </div>
    );
  }
  const visible = accords.slice(0, 5);
  const totalStrength = visible.reduce((acc, item) => acc + (item.strength ?? 1), 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {visible.map((item, index) => {
          const weight = ((item.strength ?? 1) / totalStrength) * 100;
          return (
            <div
              key={`${item.name}-${index}`}
              className="h-full"
              style={{
                width: `${weight}%`,
                backgroundColor: item.color ?? defaultAccordColor(index),
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {visible.map((item, index) => (
          <span
            key={`${item.name}-${index}`}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color ?? defaultAccordColor(index) }}
              aria-hidden="true"
            />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function defaultAccordColor(index: number): string {
  const palette = ["#b08a52", "#7a5b3a", "#c89b6c", "#3d4a3a", "#8a4f3a"];
  return palette[index % palette.length];
}
