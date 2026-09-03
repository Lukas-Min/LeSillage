import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionCard } from "@/components/ui/section";

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
      {/* Only the confirm-delete form (email confirmation) depends on the
          session's real email — everything above is static. */}
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
