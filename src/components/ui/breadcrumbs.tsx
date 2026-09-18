import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    // Capped at 80% of viewport width and centered once a screen is wide
    // enough to call "large" (2xl, 1536px+) — same treatment as the header
    // nav row and footer columns, on every page this renders on, even ones
    // whose own content isn't capped (see layout.tsx and the PDP). `w-full`
    // is required alongside `mx-auto`: auto margins on a flex item disable
    // its default stretch-to-fill behavior, so without an explicit width
    // this would shrink to the text's own content width instead of filling
    // the row and then being clamped/centered by max-w.
    <nav aria-label="Breadcrumb" className={cn("mb-4 w-full 2xl:mx-auto 2xl:max-w-[80vw]", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="inline-flex min-h-11 items-center hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
