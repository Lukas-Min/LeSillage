import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        subtitle="Keep your contact details current. Confirm changes with a 6-digit code emailed to you."
      />

      {/* Name/email are the DB row's real values — the only unknown part
          of this card, so the whole card (including its title/description,
          which SectionCard only accepts as plain strings) is skeletoned. */}
      <SectionCard eyebrow="Identity" actions={<Badge variant="secondary">Customer</Badge>}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </SectionCard>

      <SectionCard
        eyebrow="Sign-in methods"
        title="How you sign in"
        description="Email + password or a social provider. Removing a method signs you out everywhere."
      >
        <Skeleton className="h-20 w-full" />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard eyebrow="Security" title="Change password" description="Confirm with the 6-digit code we email you.">
          <Skeleton className="h-24 w-full" />
        </SectionCard>

        <SectionCard eyebrow="Security" title="Change email" description="A code is sent to the new address. All devices will be signed out.">
          <Skeleton className="h-24 w-full" />
        </SectionCard>
      </div>

      <p className="text-xs text-muted-foreground">
        <Eyebrow className="inline">Tip</Eyebrow> Adding a social login keeps access if you ever lose your password.
      </p>
    </div>
  );
}
