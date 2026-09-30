import { AdminTabs } from "@/components/admin/admin-tabs";
import { OrdersListSkeleton } from "@/components/admin/orders-skeleton";
import { AreaHeader } from "@/components/ui/page-layout";

const TABS = [
  { value: "ONGOING", label: "Ongoing", href: "/admin/orders" },
  { value: "COMPLETED", label: "Completed", href: "/admin/orders?tab=completed" },
  { value: "CANCELLED", label: "Cancelled", href: "/admin/orders?tab=cancelled" },
] as const;

/**
 * Static chrome (header + tabs) paints immediately; only the tab body is a
 * skeleton, full width like the page. `searchParams` is not available here, so
 * this always shows the Ongoing tab (every link into /admin/orders lands
 * there) — switching tabs is handled by that tab's own Suspense boundary in
 * page.tsx.
 */
export default function AdminOrdersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AreaHeader eyebrow="Admin" title="Orders" />
      <div className="flex flex-1 flex-col gap-4">
        <AdminTabs tabs={TABS} active="ONGOING" />
        <OrdersListSkeleton />
      </div>
    </div>
  );
}
