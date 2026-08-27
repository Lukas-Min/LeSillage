"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NotePyramid } from "@/lib/note-pyramid";

export function CompositionCanvas({
  brand,
  name,
  pyramid,
  className,
  showComposition = false,
  imageUrl,
  imageAlt,
  cornerLabel,
}: {
  brand: string;
  name: string;
  pyramid: NotePyramid | null;
  className?: string;
  showComposition?: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
  cornerLabel?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <div className={cn("relative aspect-square w-full overflow-hidden border border-border", className)}>
        {cornerLabel ? <CornerLabel>{cornerLabel}</CornerLabel> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageAlt ?? `${brand} — ${name}`}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col justify-between border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] p-5 sm:p-6",
        className,
      )}
    >
      {cornerLabel ? <CornerLabel>{cornerLabel}</CornerLabel> : null}
      <div className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
      <p className="relative text-center text-[10px] uppercase tracking-[0.42em] text-gold-foreground">
        {brand}
      </p>
      <div className="relative flex flex-1 items-center justify-center px-2 py-4">
        {showComposition ? (
          pyramid ? (
            <div className="grid w-full grid-cols-3 gap-2">
              <PyramidColumn label="Top" notes={pyramid.top} accent="#8b6b9e" />
              <PyramidColumn label="Heart" notes={pyramid.middle} accent="#c4b0d4" />
              <PyramidColumn label="Base" notes={pyramid.base} accent="#2c2a4a" />
            </div>
          ) : (
            <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              No composition yet
            </p>
          )
        ) : (
          <BottleGlyph />
        )}
      </div>
      <p className="relative text-center font-serif-display text-xl leading-tight sm:text-2xl">{name}</p>
    </div>
  );
}

function CornerLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-2 top-2 z-10 inline-flex items-center rounded-none bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur-sm">
      {children}
    </span>
  );
}

function BottleGlyph() {
  return (
    <svg
      viewBox="0 0 64 96"
      className="h-24 w-auto text-gold/50 transition-transform duration-500 ease-out group-hover:scale-[1.06] group-hover:text-gold/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="24" y="4" width="16" height="10" rx="2" />
      <path d="M20 14h24l4 8v66a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22Z" />
      <path d="M28 22v70" opacity="0.5" />
    </svg>
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
      <span className="h-1 w-full rounded-none" style={{ backgroundColor: accent }} aria-hidden="true" />
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
