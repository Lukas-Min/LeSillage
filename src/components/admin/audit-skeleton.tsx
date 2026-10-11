import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_CATEGORIES, type AuditCategoryFilter } from "@/lib/audit-describe";
import { cn } from "@/lib/utils";

export const AUDIT_TAB_CLASS =
  "min-h-11 shrink-0 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] whitespace-nowrap transition-colors";

/** The tabs and day-grouped event list on /admin/audit. `active` is known
 *  when this is the tab-switch fallback, and unknown in loading.tsx. */
export function AuditListSkeleton({ active }: { active?: AuditCategoryFilter }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border">
        {AUDIT_CATEGORIES.map((tab) => (
          <span
            key={tab.value}
            className={cn(
              AUDIT_TAB_CLASS,
              tab.value === active ? "border-gold text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {tab.label} (<span className="skeleton-shine inline-block h-3 w-4 rounded-md bg-muted align-middle" />)
          </span>
        ))}
      </div>
      {[5, 4].map((rows, group) => (
        <section key={group} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Card className="gap-0 py-0">
            <ol className="divide-y divide-border">
              {Array.from({ length: rows }).map((_, index) => (
                <li key={index} className="flex gap-3 px-4 py-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-full max-w-md" />
                    {index % 2 === 0 ? <Skeleton className="h-5 w-32" /> : null}
                  </div>
                  <Skeleton className="mt-1 h-3 w-14 shrink-0" />
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}
    </div>
  );
}
