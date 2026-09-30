import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The account and admin page layout, taken from the admin product page:
 * AreaHeader (eyebrow, title and badge on the left, actions on the right),
 * then PageColumns (a main column and a 22rem summary column from xl) whose
 * summary cards hold MiniStats tiles. Storefront pages keep PageHeader
 * (src/components/ui/section.tsx).
 */

/** Classes for a header action button: full width in a row on phones, natural width from sm. */
export const PAGE_ACTION_CLASS = "h-11 flex-1 sm:flex-none";

type AreaHeaderProps = Omit<React.ComponentProps<"header">, "title"> & {
  /** Small caps line above the title, e.g. "Afnan · Decant · Middle Eastern". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Shown beside the title (a Badge or status pill). */
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons and links, right-aligned from sm. */
  actions?: React.ReactNode;
};

export function AreaHeader({ eyebrow, title, badge, subtitle, actions, className, ...props }: AreaHeaderProps) {
  return (
    <header
      // Title and actions share a row only from lg: below that, with the
      // account/admin sidebar, a row of actions (an order's Confirm/Reject,
      // Ask/Cancel) would squeeze a long title like an order number.
      className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 break-words font-serif-display text-2xl sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 lg:max-w-[55%] lg:shrink-0 lg:justify-end">{actions}</div> : null}
    </header>
  );
}

/** AreaHeader's loading shape. Pass the real action buttons (disabled) so they don't shift. */
export function AreaHeaderSkeleton({
  eyebrow = true,
  badge = false,
  subtitle = false,
  actions,
}: {
  eyebrow?: boolean;
  /** Reserve the badge beside the title (a status pill or role badge). */
  badge?: boolean;
  subtitle?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <Skeleton className="h-3 w-40" /> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Skeleton className="h-8 w-64 max-w-full" />
          {badge ? <Skeleton className="h-6 w-24" /> : null}
        </div>
        {subtitle ? <Skeleton className="h-4 w-56 max-w-full" /> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 lg:max-w-[55%] lg:shrink-0 lg:justify-end">{actions}</div> : null}
    </div>
  );
}

/**
 * A main column and a 22rem summary column side by side from xl. Below xl
 * it's one stack, summary first — the summary also comes first in the page
 * source, so the reading and tab order match what phones show.
 */
export function PageColumns({
  main,
  side,
  sideLabel = "Summary",
  className,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
  /** Names the summary column's landmark for screen readers. */
  sideLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start",
        className,
      )}
    >
      <aside aria-label={sideLabel} className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-1">
        {side}
      </aside>
      <div className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">{main}</div>
    </div>
  );
}

/** Small number tiles, two per row (the admin product page's Decant pool). */
export function MiniStats({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("grid grid-cols-2 gap-3", className)} {...props} />;
}

export function MiniStat({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border p-3", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-serif-display text-2xl tabular-nums">{value}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

/** MiniStats' loading shape: the real labels, a placeholder for each value. */
export function MiniStatsSkeleton({
  labels,
  wide = [],
  className,
}: {
  labels: readonly string[];
  /** Labels whose tile spans both columns on the page (peso amounts, totals). */
  wide?: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {labels.map((label) => (
        <div key={label} className={cn("rounded-lg border p-3", wide.includes(label) && "col-span-2")}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <Skeleton className="mt-2 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
