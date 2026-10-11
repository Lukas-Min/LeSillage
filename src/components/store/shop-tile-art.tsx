import type { ReactNode } from "react";

export type ShopTileArtName =
  | "decant"
  | "full-bottle"
  | "partial"
  | "all"
  | "men"
  | "women"
  | "middle-eastern"
  | "designer"
  | "niche";

/** A fill drawn faintly inside an outline, standing in for the liquid. */
const LIQUID = { fill: "currentColor", fillOpacity: 0.28, stroke: "none" } as const;

/**
 * Line drawings on a 64×64 grid, stroked in `currentColor`: an atomizer vial
 * for decants, a full flacon, the same flacon half full for partials, the
 * three side by side for everything, the Mars and Venus signs, and for the
 * scent families an attar bottle with a spire stopper (Middle Eastern), a
 * tall bottle tied with a bow (Designer), and a corked apothecary bottle with
 * a hand-tied tag (Niche).
 */
const ART: Record<ShopTileArtName, ReactNode> = {
  decant: (
    <>
      <rect x="29" y="10" width="6" height="7" rx="1" />
      <path d="M35 13.5h3" />
      <circle cx="42" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="45.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="45.5" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="49" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <rect x="26" y="17" width="12" height="4" rx="1" />
      <rect x="27" y="21" width="10" height="37" rx="2.5" />
      <path d="M29 31h6v23.5a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5Z" {...LIQUID} />
    </>
  ),
  "full-bottle": (
    <>
      <rect x="25" y="5" width="14" height="10" rx="1.5" />
      <rect x="29" y="15" width="6" height="5" />
      <rect x="13" y="20" width="38" height="38" rx="4" />
      <rect x="16.5" y="24" width="31" height="30.5" rx="2" {...LIQUID} />
      <rect x="24" y="33" width="16" height="11" rx="0.5" />
    </>
  ),
  partial: (
    <>
      <rect x="25" y="5" width="14" height="10" rx="1.5" />
      <rect x="29" y="15" width="6" height="5" />
      <rect x="13" y="20" width="38" height="38" rx="4" />
      <path
        d="M16.5 41q5.17-2 10.33 0t10.34 0t10.33 0v11.5a2 2 0 0 1-2 2h-27a2 2 0 0 1-2-2Z"
        {...LIQUID}
      />
      <path d="M16.5 41q5.17-2 10.33 0t10.34 0t10.33 0" />
    </>
  ),
  all: (
    <>
      <rect x="11.5" y="26" width="5" height="6" rx="1" />
      <rect x="9.5" y="32" width="9" height="26" rx="2" />
      <path d="M11.5 41h5v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1Z" {...LIQUID} />
      <rect x="27" y="7" width="10" height="8" rx="1.5" />
      <rect x="29.5" y="15" width="5" height="4" />
      <rect x="23" y="19" width="18" height="39" rx="3" />
      <rect x="26" y="23" width="12" height="32" rx="1.5" {...LIQUID} />
      <rect x="47" y="24" width="8" height="5" rx="1" />
      <rect x="49" y="29" width="4" height="4" />
      <circle cx="51" cy="45" r="12" />
      <path d="M40.5 47.5a10.5 10.5 0 0 0 21 0Z" {...LIQUID} />
    </>
  ),
  men: (
    <>
      <circle cx="26" cy="38" r="15" />
      <path d="M36.6 27.4 52 12M40 12h12v12" />
    </>
  ),
  women: (
    <>
      <circle cx="32" cy="24" r="15" />
      <path d="M32 39v20M23 51h18" />
    </>
  ),
  "middle-eastern": (
    <>
      <path d="M32 4c1 5 7 9 7 14a7 5 0 0 1-14 0c0-5 6-9 7-14Z" />
      <rect x="27" y="23" width="10" height="2" rx="0.5" />
      <rect x="29" y="25" width="6" height="5" />
      <path d="M28 30c-12 6-14 20-7 27h22c7-7 5-21-7-27Z" />
      <path d="M18.5 41h27M17.5 48h29" />
      <path d="M32 42.5l2.5 2.5-2.5 2.5-2.5-2.5Z" fill="currentColor" fillOpacity={0.28} />
      <path d="M17.6 48c.2 3.5 1.4 6.6 3.4 9h22c2-2.4 3.2-5.5 3.4-9Z" {...LIQUID} />
    </>
  ),
  designer: (
    <>
      <rect x="27" y="4" width="10" height="9" rx="1" />
      <rect x="29" y="13" width="6" height="9" />
      <path d="M32 17l-9-4.5v9ZM32 17l9-4.5v9Z" />
      <circle cx="32" cy="17" r="1.6" fill="currentColor" stroke="none" />
      <rect x="21" y="22" width="22" height="36" rx="2" />
      <rect x="24" y="26" width="16" height="29" rx="1" {...LIQUID} />
    </>
  ),
  niche: (
    <>
      <rect x="28" y="6" width="8" height="7" rx="1" />
      <rect x="29" y="13" width="6" height="7" />
      <path d="M29 20c0 4-13 5-13 13v21a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V33c0-8-13-9-13-13" />
      <rect x="19" y="38" width="26" height="17" rx="2" {...LIQUID} />
      <path d="M35 16c7 0 11 2 13 6" />
      <path d="M47 21l8 4-3 7-8-4Z" />
      <circle cx="48.5" cy="24" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

/** The ShopTile watermark drawing for one shelf. Decorative only. */
export function ShopTileArt({ name, className }: { name: ShopTileArtName; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ART[name]}
    </svg>
  );
}
