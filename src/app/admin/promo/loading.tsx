import { AdminTabs } from "@/components/admin/admin-tabs";
import { PromoSettingsSkeleton } from "@/components/admin/promo-skeletons";

/**
 * Static chrome (title + tabs) paints immediately; only the tab body is a
 * skeleton. `searchParams` is not available here, so this always shows the
 * Settings tab's shape, with no tab marked active — switching to Promo codes is
 * handled by that tab's own Suspense boundary in page.tsx.
 */
export default function AdminPromoLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Promo & delivery</h1>
      </div>
      <AdminTabs
        tabs={[
          { value: "settings", label: "Settings", href: "/admin/promo" },
          { value: "codes", label: "Promo codes", href: "/admin/promo?tab=codes" },
        ]}
        active=""
      />
      <PromoSettingsSkeleton />
    </div>
  );
}
