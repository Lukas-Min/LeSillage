import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { FORM_ACTION_CLASS } from "@/components/ui/form-action";

export default function DeleteAccountLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Delete account"
        subtitle="Removing your account deletes your profile, addresses, wishlist, and login methods. Order history is kept for our records."
      />
      <SectionCard
        className="border-destructive/30"
        eyebrow="Danger"
        title="This cannot be undone"
        actions={<TriangleAlert className="h-4 w-4 text-destructive" />}
      >
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          <li>We will remove your name, email, addresses, wishlist, and linked sign-in methods.</li>
          <li>Open orders must be completed or cancelled first.</li>
          <li>You will receive a final confirmation email after deletion.</li>
        </ul>
      </SectionCard>
      {/* Mirrors DeleteAccountForm. Only the email comes from the session;
          the inputs stay skeletons so nothing typed early is lost. */}
      <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">
          Type{" "}
          <span className="skeleton-shine inline-block h-3.5 w-40 rounded-md bg-muted align-middle" /> to
          confirm. Then enter the 6-digit code we email you.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">
            We will email a confirmation code to your current email.
          </p>
          <Button type="button" variant="outline" size="sm">
            Email code
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Confirm email</Label>
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label>6-digit code</Label>
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <Button type="button" variant="destructive" className={FORM_ACTION_CLASS}>
            Delete my account
          </Button>
        </div>
      </div>
    </div>
  );
}
