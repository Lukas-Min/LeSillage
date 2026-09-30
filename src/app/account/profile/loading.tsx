import Link from "next/link";
import { Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard, Eyebrow } from "@/components/ui/section";
import { AreaHeader } from "@/components/ui/page-layout";
import { Badge } from "@/components/ui/badge";
import { GoogleIcon } from "@/components/store/brand-icons";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { cn } from "@/lib/utils";

// Spans, not <Skeleton> (a div): they sit inside SectionCard's <h2>/<p>.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

// Mirrors the forms in profile-forms.tsx. Labels and buttons are static;
// the inputs stay skeletons so nothing typed early is lost on the swap.
function FieldSkeleton({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Skeleton className="h-11 w-full rounded-lg" />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FormButton({ label }: { label: string }) {
  return (
    <Button type="button" className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
      {label}
    </Button>
  );
}

const methodRowClassName =
  "flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 text-sm";

export default function ProfileLoading() {
  const oauthProviders = configuredOAuthProviders();
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Account"
        title="Your profile"
        subtitle="Keep your contact details current. Confirm changes with a 6-digit code emailed to you."
      />

      <SectionCard
        eyebrow="Identity"
        title={<span className={cn(inlineSkeleton, "h-4 w-32")} />}
        description={
          <>
            Signed in as <span className={cn(inlineSkeleton, "h-3.5 w-40")} />. Shown on orders, receipts, and
            shipping labels.
          </>
        }
        actions={<Badge variant="secondary">Customer</Badge>}
      >
        <div className="space-y-3">
          <FieldSkeleton label="Full name" />
          <FieldSkeleton
            label="Email"
            hint="To change your email, use the section below — a confirmation code is required."
          />
          <FieldSkeleton
            label="Mobile (PH)"
            hint="10 digits, starts with 9. The country code +63 is added automatically."
          />
          <FormButton label="Save" />
        </div>
      </SectionCard>

      {/* Which methods are active or linked comes from the user's rows; the
          providers themselves come from env, same as the page. */}
      <SectionCard
        eyebrow="Sign-in methods"
        title="How you sign in"
        description="Email + password or a social provider. Removing a method signs you out everywhere."
      >
        <ul className="space-y-2">
          <li className={methodRowClassName}>
            <span className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email and password
            </span>
            <Skeleton className="h-11 w-28 shrink-0 rounded-lg" />
          </li>
          {oauthProviders.map((provider) => (
            <li key={provider} className={methodRowClassName}>
              <span className="flex items-center gap-2 font-medium">
                {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : null}
                {provider === "google" ? "Google" : "Facebook"}
              </span>
              <Skeleton className="h-11 w-28 shrink-0 rounded-lg" />
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard
          eyebrow="Security"
          title="Change password"
          description="Enter your current password and a new one. We email a code to confirm."
        >
          <div className="space-y-3">
            <FieldSkeleton label="Current password" />
            <FieldSkeleton label="New password" hint="At least 6 characters, with a letter and a number." />
            <FieldSkeleton label="Confirm password" />
            <FormButton label="Continue" />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Security"
          title="Change email"
          description="Enter the new address. We email a code there to confirm."
        >
          <div className="space-y-3">
            <FieldSkeleton label="New email" />
            <FormButton label="Continue" />
          </div>
        </SectionCard>
      </div>

      <p className="text-xs text-muted-foreground">
        <Eyebrow className="inline">Tip</Eyebrow>
        {" "}Adding a social login keeps access if you ever lose your password.
      </p>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Step away for up to 30 days. Log back in and the account is restored.
        </p>
        <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
          <Link href="/account/archive">Archive account</Link>
        </Button>
      </div>
    </div>
  );
}
