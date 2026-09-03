import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionCard } from "@/components/ui/section";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="What we email you about"
        subtitle="Order updates always send. Toggle marketing news separately."
      />
      <SectionCard
        eyebrow="Email"
        title="Marketing updates"
        description="Order receipts, payment confirmations, and shipping alerts will always be sent. This toggle only controls promotional news."
        actions={<Bell className="h-4 w-4 text-gold" />}
      >
        {/* The toggle's current state comes from the user's row — the only
            genuinely data-dependent part of this page. */}
        <Skeleton className="h-8 w-24" />
      </SectionCard>
      <SectionCard
        eyebrow="Security"
        title="Account alerts"
        description="We email you immediately when your password or sign-in methods change, even if marketing emails are disabled."
      >
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            Password changed
          </li>
          <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            New email requested
          </li>
          <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            Account deletion confirmation
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
