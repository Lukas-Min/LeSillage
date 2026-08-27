import { TriangleAlert } from "lucide-react";
import { requireActiveCustomer } from "@/auth";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { DeleteAccountForm } from "./delete-form";

export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const user = await requireActiveCustomer();
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
      <DeleteAccountForm email={user.email} />
    </div>
  );
}