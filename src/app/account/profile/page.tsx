import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, accounts } from "@/db/schema";
import { requireActiveCustomer } from "@/auth";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import {
  ProfileForm,
  ChangePasswordForm,
  ChangeEmailForm,
} from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireActiveCustomer();
  const row = (await db().select().from(users).where(eq(users.id, sessionUser.id)))[0];
  const linked = await db().select().from(accounts).where(eq(accounts.userId, sessionUser.id));
  const phone = (row?.phone ?? "").replace(/^\+63/, "");
  const hasPassword = Boolean(row?.passwordHash);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        subtitle="Keep your contact details current. Confirm changes with a 6-digit code emailed to you."
      />

      <SectionCard
        eyebrow="Identity"
        title={row?.name ?? "Set your name"}
        description={`Signed in as ${row?.email ?? ""}. Shown on orders, receipts, and shipping labels.`}
        actions={<Badge variant="secondary">Customer</Badge>}
      >
        <ProfileForm
          initialName={row?.name ?? ""}
          initialEmail={row?.email ?? ""}
          initialPhone={phone}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Sign-in methods"
        title="How you sign in"
        description="Email + password or a social provider. Removing a method signs you out everywhere."
      >
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
            <span className="font-medium">Email and password</span>
            <Badge variant={hasPassword ? "default" : "outline"}>
              {hasPassword ? "Active" : "Not set"}
            </Badge>
          </li>
          {linked.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
              No social logins linked.
            </li>
          ) : (
            linked.map((account) => (
              <li
                key={`${account.provider}:${account.providerAccountId}`}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize">{account.provider}</span>
                <Badge variant="secondary">Linked</Badge>
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard
          eyebrow="Security"
          title="Change password"
          description="Confirm with the 6-digit code we email you."
        >
          <ChangePasswordForm />
        </SectionCard>

        <SectionCard
          eyebrow="Security"
          title="Change email"
          description="A code is sent to the new address. All devices will be signed out."
        >
          <ChangeEmailForm />
        </SectionCard>
      </div>

      <p className="text-xs text-muted-foreground">
        <Eyebrow className="inline">Tip</Eyebrow>
        {" "}Adding a social login keeps access if you ever lose your password.
      </p>
    </div>
  );
}