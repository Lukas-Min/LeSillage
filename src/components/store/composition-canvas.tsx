"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { NotePyramid } from "@/lib/note-pyramid";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const LIGHTBOX_ZOOM_SCALE = 1.5;

/** Keeps a drag from panning the zoomed photo so far that its edge leaves a
 *  gap inside the (fixed-size) lightbox — at `scale`, the photo overhangs
 *  its box by `(scale - 1)` on each side, so panning past half of that in
 *  either direction would expose empty space past the image's edge. */
function clampPan(value: number, containerSize: number, scale: number): number {
  const max = (containerSize * (scale - 1)) / 2;
  return Math.min(max, Math.max(-max, value));
}

/** The `<img>` is `object-contain`, so its actually-rendered photo is
 *  smaller than its box on whichever axis the photo's aspect ratio doesn't
 *  match the box's — clampPan must clamp against that rendered size, not
 *  the box's own clientWidth/clientHeight, or panning can reveal empty
 *  space past the photo's real edge on the letterboxed axis. */
function containedSize(
  boxWidth: number,
  boxHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) return { width: boxWidth, height: boxHeight };
  const boxRatio = boxWidth / boxHeight;
  const imageRatio = naturalWidth / naturalHeight;
  return imageRatio > boxRatio
    ? { width: boxWidth, height: boxWidth / imageRatio }
    : { width: boxHeight * imageRatio, height: boxHeight };
}

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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Only used to drop the transform transition during an active drag, so
  // panning tracks the pointer 1:1 instead of animating 300ms behind it —
  // the transition still runs for the click-triggered zoom in/out.
  const [dragging, setDragging] = useState(false);
  // A state (not a ref) so the wheel-listener effect below re-attaches every
  // time the dialog opens — Radix unmounts DialogContent on close, so a ref
  // alone would leave the effect's dependency array with nothing to react to.
  const [lightboxEl, setLightboxEl] = useState<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Tracks an in-progress drag between pointerdown and pointerup; also
  // doubles as the "was this a drag, not a click" flag so releasing after a
  // real drag doesn't also toggle the zoom level via the onClick handler.
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(
    null,
  );

  // React attaches its own onWheel handler as a passive listener, so calling
  // preventDefault() from it can't stop the page from scrolling underneath —
  // only a manually-attached, non-passive native listener can. This has to
  // live outside the `enableLightbox`/`imageUrl` branches below (unconditional
  // hook call), guarded internally instead.
  useEffect(() => {
    if (!lightboxEl || !zoomed) return;
    const handleWheel = (e: WheelEvent) => e.preventDefault();
    lightboxEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => lightboxEl.removeEventListener("wheel", handleWheel);
  }, [lightboxEl, zoomed]);

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
      const resetZoom = () => {
        setZoomed(false);
        setPan({ x: 0, y: 0 });
        // A drag can be interrupted (pointercancel, or the dialog closing
        // mid-drag) without the pointerup/click that normally clears these,
        // which would otherwise swallow the next click or leave the
        // transition permanently disabled — see onPointerCancel below.
        setDragging(false);
        dragRef.current = null;
      };

      const applyPan = (dx: number, dy: number) => {
        const box = lightboxEl;
        if (!box) return;
        const { width, height } = containedSize(
          box.clientWidth,
          box.clientHeight,
          imgRef.current?.naturalWidth ?? 0,
          imgRef.current?.naturalHeight ?? 0,
        );
        setPan((prev) => ({
          x: clampPan(prev.x + dx, width, LIGHTBOX_ZOOM_SCALE),
          y: clampPan(prev.y + dy, height, LIGHTBOX_ZOOM_SCALE),
        }));
      };

      return (
        <Dialog onOpenChange={(open) => !open && resetZoom()}>
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
            ref={setLightboxEl}
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
            onWheel={(e) => {
              // The native, non-passive listener attached by the effect
              // above is what actually stops the page scrolling — React's
              // own onWheel is registered passive, so preventDefault() here
              // would be a no-op. This handler only updates the pan.
              if (!zoomed) return;
              applyPan(-e.deltaX, -e.deltaY);
            }}
          >
            <DialogTitle className="sr-only">{alt}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt={alt}
              onClick={() => {
                // A drag ending on the image also fires a click; swallow
                // that one so dragging to pan doesn't also toggle zoom off.
                if (dragRef.current?.moved) {
                  dragRef.current = null;
                  return;
                }
                dragRef.current = null;
                if (zoomed) {
                  resetZoom();
                } else {
                  setZoomed(true);
                }
              }}
              onPointerDown={(e) => {
                if (!zoomed) return;
                dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y, moved: false };
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const drag = dragRef.current;
                if (!drag) return;
                const dx = e.clientX - drag.startX;
                const dy = e.clientY - drag.startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
                const box = lightboxEl;
                if (!box) return;
                const { width, height } = containedSize(
                  box.clientWidth,
                  box.clientHeight,
                  imgRef.current?.naturalWidth ?? 0,
                  imgRef.current?.naturalHeight ?? 0,
                );
                setPan({
                  x: clampPan(drag.originX + dx, width, LIGHTBOX_ZOOM_SCALE),
                  y: clampPan(drag.originY + dy, height, LIGHTBOX_ZOOM_SCALE),
                });
              }}
              onPointerCancel={(e) => {
                // No click follows a cancelled gesture (unlike pointerup),
                // so this is the only place a cancelled drag gets cleaned
                // up — otherwise dragging stays stuck true and the next
                // real click gets swallowed as if it ended a drag.
                setDragging(false);
                dragRef.current = null;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                setDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              draggable={false}
              style={zoomed ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${LIGHTBOX_ZOOM_SCALE})` } : undefined}
              className={cn(
                // object-contain, never object-cover — the bottle must
                // never be cropped (see the earlier object-cover ->
                // object-contain change on this component). Zoom scales the
                // already-fitted photo up around its center (and, once
                // zoomed, lets it be dragged or scrolled around); the
                // container above clips whatever spills past its own
                // 80vh/80vw box. The transition is dropped while actively
                // dragging so panning tracks the pointer immediately instead
                // of animating 300ms behind it.
                "h-full w-full touch-none rounded-lg bg-white object-contain",
                dragging ? "" : "transition-transform duration-300 ease-out",
                zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
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
