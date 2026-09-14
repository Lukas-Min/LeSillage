import { PromoSettingsSkeleton } from "@/components/admin/promo-skeletons";

/**
 * Static chrome (title + tabs) paints immediately; only the tab body is a
 * skeleton. `searchParams` is not available here, so this always shows the
 * Settings tab's shape — switching to Promo codes is handled by that tab's own
 * Suspense boundary in page.tsx.
 */
export default function AdminPromoLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {["Settings", "Promo codes"].map((label) => (
          <span
            key={label}
            className="min-h-11 border-b-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <PromoSettingsSkeleton />
    </div>
  );
}
