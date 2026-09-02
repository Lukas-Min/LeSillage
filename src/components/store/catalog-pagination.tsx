import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIBLINGS = 1;
const ELLIPSIS = "…" as const;

/** Windowed page list with ellipses, e.g. total=20 current=10 -> [1, …, 9, 10, 11, …, 20]. */
function pageRange(current: number, total: number): Array<number | typeof ELLIPSIS> {
  const pages = new Set<number>([1, total, current]);
  for (let i = 1; i <= SIBLINGS; i++) {
    if (current - i >= 1) pages.add(current - i);
    if (current + i <= total) pages.add(current + i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | typeof ELLIPSIS> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(ELLIPSIS);
    result.push(sorted[i]);
  }
  return result;
}

export function CatalogPagination({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Catalog pages" className="mt-8 flex items-center justify-center gap-1.5">
      {hasPrev ? (
        <>
          <PagerButton href={href(1)} label="First page" icon={<ChevronsLeft />} className="hidden sm:inline-flex" />
          <PagerButton href={href(page - 1)} label="Previous page" icon={<ChevronLeft />} />
        </>
      ) : null}

      {/* Full numbered range on wider screens */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {pageRange(page, totalPages).map((entry, i) =>
          entry === ELLIPSIS ? (
            <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">
              {ELLIPSIS}
            </span>
          ) : (
            <Button
              key={entry}
              asChild={entry !== page}
              variant={entry === page ? "gold" : "outline"}
              size="icon"
              className={cn("min-h-11 min-w-11 rounded-md text-xs", entry === page && "pointer-events-none")}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry === page ? <span>{entry}</span> : <Link href={href(entry)}>{entry}</Link>}
            </Button>
          ),
        )}
      </div>

      {/* Compact page readout on mobile */}
      <span className="px-2 text-xs text-muted-foreground sm:hidden">
        Page {page} of {totalPages}
      </span>

      {hasNext ? (
        <>
          <PagerButton href={href(page + 1)} label="Next page" icon={<ChevronRight />} />
          <PagerButton href={href(totalPages)} label="Last page" icon={<ChevronsRight />} className="hidden sm:inline-flex" />
        </>
      ) : null}
    </nav>
  );
}

function PagerButton({
  href,
  label,
  icon,
  className,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Button asChild variant="outline" size="icon" aria-label={label} className={cn("min-h-11 min-w-11 rounded-md", className)}>
      <Link href={href}>{icon}</Link>
    </Button>
  );
}
