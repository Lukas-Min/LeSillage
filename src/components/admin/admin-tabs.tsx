import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Query-string tabs on one admin route (/admin/orders, /admin/promo). Each
 * page still wraps its tab content in a Suspense keyed to the active tab —
 * loading.tsx does not retrigger for a query-string-only navigation.
 */
export function AdminTabs({
  tabs,
  active,
}: {
  tabs: readonly { value: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "min-h-11 border-b-2 px-3 py-2 text-xs uppercase tracking-[0.15em] transition-colors",
            active === tab.value
              ? "border-gold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
