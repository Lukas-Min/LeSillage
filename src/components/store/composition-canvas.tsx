"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NotePyramid } from "@/lib/note-pyramid";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CompositionCanvas({
  brand,
  name,
  pyramid,
  className,
  showComposition = false,
  imageUrl,
  imageAlt,
  cornerLabel,
  enableLightbox = false,
}: {
  brand: string;
  name: string;
  pyramid: NotePyramid | null;
  className?: string;
  showComposition?: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
  cornerLabel?: string | null;
  /** Clicking the photo opens a larger version in a modal — only safe where
   *  the canvas isn't already wrapped in a navigation Link (nesting an
   *  interactive trigger inside one is invalid HTML). Product cards ARE
   *  Link-wrapped and never pass this; the product detail page and the
   *  homepage flagship aren't, so both do. */
  enableLightbox?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (imageUrl && !imageFailed) {
    const alt = imageAlt ?? `${brand} — ${name}`;
    const photo = (
      <>
        {cornerLabel ? <CornerLabel>{cornerLabel}</CornerLabel> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
      </>
    );

    if (enableLightbox) {
      return (
        <Dialog onOpenChange={(open) => !open && setZoomed(false)}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`View larger image of ${alt}`}
              className={cn(
                "group relative aspect-square w-full cursor-zoom-in overflow-hidden border border-border bg-white p-4",
                className,
              )}
            >
              {photo}
            </button>
          </DialogTrigger>
          <DialogContent
            className={cn(
              // The container's own size never changes with zoom — only the
              // photo inside it does. Sizing lives here rather than on the
              // <img> because Tailwind's `img { max-width: 100% }` preflight
              // rule fights a percentage/vw width set directly on the image
              // when its parent is `w-fit` (the two sizes depend on each
              // other); a definite-sized parent with an `h-full w-full`
              // image sidesteps that. `overflow-hidden` clips the zoomed
              // photo to this box instead of letting it spill past it. The
              // base DialogContent's own `sm:max-w-sm` sorts after a plain
              // `max-w-[…]` utility at the `sm` breakpoint and up, so it must
              // be overridden at the same `sm:` variant to actually lose.
              "flex h-[80vh] w-[80vw] max-w-[92vw] items-center justify-center overflow-hidden border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-[92vw]",
            )}
          >
            <DialogTitle className="sr-only">{alt}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={alt}
              onClick={() => setZoomed((prev) => !prev)}
              className={cn(
                // object-contain, never object-cover — the bottle must
                // never be cropped (see the earlier object-cover ->
                // object-contain change on this component). Zoom scales the
                // already-fitted photo up around its center; the container
                // above clips whatever spills past its own 80vh/80vw box.
                "h-full w-full rounded-lg bg-white object-contain transition-transform duration-300 ease-out",
                // Bare scale-100/scale-150 never render in this project's
                // Tailwind build (nothing else in the codebase uses them —
                // every existing zoom effect already goes through the
                // arbitrary-value form below, e.g. group-hover:scale-[1.05]).
                zoomed ? "scale-[1.5] cursor-zoom-out" : "scale-[1] cursor-zoom-in",
              )}
            />
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div
        className={cn(
          "group relative aspect-square w-full overflow-hidden border border-border bg-white p-4",
          className,
        )}
      >
        {photo}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "group relative flex aspect-square w-full flex-col justify-between overflow-hidden border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] p-5 sm:p-6",
        className,
      )}
    >
      {cornerLabel ? <CornerLabel>{cornerLabel}</CornerLabel> : null}
      <div className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
      <p className="relative text-center text-[10px] uppercase tracking-[0.42em] text-gold">
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
      className="h-24 w-auto text-gold/50 transition-transform duration-500 ease-out group-hover:scale-[1.05] group-hover:text-gold/70"
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
