import { eq } from "drizzle-orm";
import { Bell } from "lucide-react";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/actions/account-actions";
import { NotificationsForm } from "./notifications-form";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireActiveCustomer();
  const row = (await db().select().from(users).where(eq(users.id, user.id)))[0];
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
        <NotificationsForm initial={Boolean(row?.marketingOptIn)} />
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