import { cn } from "@/lib/utils";
import type { NotePyramid } from "@/lib/note-pyramid";

export function CompositionCanvas({
  brand,
  name,
  pyramid,
  className,
}: {
  brand: string;
  name: string;
  pyramid: NotePyramid | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col justify-between rounded-md border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] p-5 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
      <p className="relative text-center text-[10px] uppercase tracking-[0.42em] text-gold-foreground">
        {brand}
      </p>
      <div className="relative flex flex-1 items-center justify-center px-2 py-4">
        {pyramid ? (
          <div className="grid w-full grid-cols-3 gap-2">
            <PyramidColumn label="Top" notes={pyramid.top} accent="#8b6b9e" />
            <PyramidColumn label="Heart" notes={pyramid.middle} accent="#c4b0d4" />
            <PyramidColumn label="Base" notes={pyramid.base} accent="#2c2a4a" />
          </div>
        ) : (
          <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            No composition yet
          </p>
        )}
      </div>
      <p className="relative text-center font-serif-display text-xl leading-tight sm:text-2xl">{name}</p>
    </div>
  );
}

function PyramidColumn({
  label,
  notes,
  accent,
}: {
  label: string;
  notes: string[];
  accent: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
      <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      {notes.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">—</p>
      ) : (
        <p className="line-clamp-4 text-center text-[11px] leading-snug text-foreground/80">
          {notes.join(" · ")}
        </p>
      )}
    </div>
  );
}
