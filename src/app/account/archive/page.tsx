import { eq } from "drizzle-orm";
import { PauseCircle } from "lucide-react";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { ArchiveAccountForm } from "./archive-form";

export const dynamic = "force-dynamic";

export default async function ArchiveAccountPage() {
  const user = await requireActiveCustomer();
  const row = (await db().select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)))[0];
  const hasPassword = Boolean(row?.passwordHash);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Archive account"
        subtitle="A temporary, reversible way to step away — signs you out and gives you 30 days to change your mind."
      />
      <SectionCard
        className="border-destructive/30"
        eyebrow="What happens"
        title="Archiving your account"
        actions={<PauseCircle className="h-4 w-4 text-destructive" />}
      >
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          <li>You will be signed out immediately.</li>
          <li>Log back in any time within 30 days and your account picks up right where it left off — archiving is cancelled automatically.</li>
          <li>If 30 days pass with no login, your account is permanently deleted the same way &ldquo;Delete account&rdquo; works.</li>
        </ul>
      </SectionCard>
      <ArchiveAccountForm hasPassword={hasPassword} />
    </div>
  );
}
