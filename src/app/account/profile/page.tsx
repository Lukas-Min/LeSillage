import { Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, accounts } from "@/db/schema";
import { requireActiveCustomer } from "@/auth";
import { GoogleIcon } from "@/components/store/brand-icons";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import {
  ProfileForm,
  ChangePasswordForm,
  ChangeEmailForm,
  ConnectProviderButton,
} from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireActiveCustomer();
  const row = (await db().select().from(users).where(eq(users.id, sessionUser.id)))[0];
  const linked = await db().select().from(accounts).where(eq(accounts.userId, sessionUser.id));
  const phone = (row?.phone ?? "").replace(/^\+63/, "");
  const hasPassword = Boolean(row?.passwordHash);
  const linkedProviders = new Set(linked.map((account) => account.provider));
  const oauthProviders = configuredOAuthProviders();
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
          <li className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email and password
            </span>
            <span className="inline-flex h-11 w-28 shrink-0 items-center justify-center rounded-lg border border-border text-sm font-medium">
              {hasPassword ? "Active" : "Not set"}
            </span>
          </li>
          {oauthProviders.map((provider) => (
            <li
              key={provider}
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 text-sm"
            >
              <span className="flex items-center gap-2 font-medium">
                {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : null}
                {provider === "google" ? "Google" : "Facebook"}
              </span>
              {linkedProviders.has(provider) ? (
                <span className="inline-flex h-11 w-28 shrink-0 items-center justify-center rounded-lg border border-border text-sm font-medium">
                  Linked
                </span>
              ) : (
                <ConnectProviderButton provider={provider} />
              )}
            </li>
          ))}
          {oauthProviders.length === 0 && linked.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
              No social logins linked.
            </li>
          ) : null}
        </ul>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard
          eyebrow="Security"
          title="Change password"
          description="Enter your current password and a new one. We email a code to confirm."
        >
          <ChangePasswordForm hasPassword={hasPassword} />
        </SectionCard>

        <SectionCard
          eyebrow="Security"
          title="Change email"
          description="Enter the new address. We email a code there to confirm."
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