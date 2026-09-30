import { AdminTabs } from "@/components/admin/admin-tabs";
import { PromoSettingsSkeleton } from "@/components/admin/promo-skeletons";
import { AreaHeader } from "@/components/ui/page-layout";

/**
 * Static chrome (header + tabs) paints immediately; only the tab body (its
 * summary and cards) is a skeleton. `searchParams` is not available here, so
 * this always shows the Settings tab's shape, with no tab marked active and no
 * New button — switching to Promo codes is handled by that tab's own Suspense
 * boundary in page.tsx.
 */
export default function AdminPromoLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader eyebrow="Admin" title="Promo & delivery" />
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
