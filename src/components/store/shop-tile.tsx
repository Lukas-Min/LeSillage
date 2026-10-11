import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ShopTileArt, type ShopTileArtName } from "@/components/store/shop-tile-art";
import { cn } from "@/lib/utils";

type TileSize = "page" | "menu" | "compact";

const SIZE = {
  page: {
    tile: "min-h-40 p-5 sm:min-h-56 sm:p-6",
    art: "top-10 right-4 h-16 w-16 sm:top-14 sm:right-5 sm:h-24 sm:w-24",
    title: "text-2xl sm:text-3xl",
  },
  menu: {
    tile: "min-h-40 p-6",
    art: "bottom-3 right-5 h-24 w-24",
    title: "text-2xl",
  },
  compact: {
    tile: "min-h-24 p-4",
    art: "bottom-2 right-3 h-16 w-16",
    title: "text-xl",
  },
} satisfies Record<TileSize, Record<string, string>>;

/**
 * The store's framed, gold-tinted link card: an inner hairline frame, a
 * line drawing of the shelf or family as a watermark in the bottom-right,
 * "Explore" in the top-right, and the title plus a short line at the bottom. "Explore" is in the
 * flow, not pinned: a title that wraps on a narrow tile ("All fragrances")
 * makes the tile taller instead of running into it. Used for the
 * homepage scent families, the header's Shop menu, and the phone menu, so
 * all three read as one family. No "use client": the homepage renders it on
 * the server; the menus pass `onClick` to close themselves.
 */
export function ShopTile({
  href,
  title,
  description,
  size = "page",
  as: Title = "h3",
  art,
  onClick,
  className,
}: {
  href: string;
  title: string;
  description: string;
  size?: TileSize;
  /** "p" inside menus, where a heading per link would be noise. */
  as?: "h3" | "p";
  /** The watermark drawing (`shop-tile-art.tsx`). */
  art: ShopTileArtName;
  onClick?: () => void;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex h-full select-none flex-col overflow-hidden rounded-md border border-gold/35 bg-[color-mix(in_oklch,var(--card),var(--gold)_10%)] transition-colors hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
        s.tile,
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
      <ShopTileArt
        name={art}
        className={cn(
          "pointer-events-none absolute text-gold/45 transition-colors group-hover:text-gold/70 dark:text-gold/30 dark:group-hover:text-gold/50",
          s.art,
        )}
      />
      <span className="relative inline-flex items-center gap-1 self-end text-xs uppercase tracking-[0.2em] text-gold-ink">
        Explore
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <Title className={cn("relative mt-auto pt-3 font-serif-display leading-tight", s.title)}>{title}</Title>
      <p className="relative mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
