// Shared look for every small pill overlaid on a product photo (rating,
// category tag, save %) — callers add their own position (`absolute
// left-2 top-2` etc.), gap/uppercase/tracking, and any responsive size
// overrides on top. Centralized so a future legibility tweak (border,
// padding, text size) is one edit instead of finding every call site.
//
// This must NOT live in composition-canvas.tsx: that file is "use client",
// and importing a plain constant (not a component) from a "use client"
// module into a Server Component (product-card.tsx, app/page.tsx) throws
// at render time — Next.js only allows importing components/functions
// across that boundary, not arbitrary values. Keeping this in its own
// plain module lets both server and client components import it safely.
export const OVERLAY_PILL_CLASS =
  "z-10 inline-flex items-center rounded-none border border-foreground/25 bg-background/90 px-2.5 py-1 text-[13px] font-medium text-foreground shadow-sm backdrop-blur-sm";
