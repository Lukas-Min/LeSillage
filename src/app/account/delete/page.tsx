import { requireActiveCustomer } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteAccount, requestReauthCode } from "@/actions/account-actions";

export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const user = await requireActiveCustomer();
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Delete account</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This cannot be undone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Order history is kept for records. Your name, email, addresses, wishlist, and login methods are removed.
            Open orders must be completed or cancelled first.
          </p>
          <form action={requestReauthCode}>
            <SubmitButton variant="outline">Email a confirmation code</SubmitButton>
          </form>
          <form action={deleteAccount} className="space-y-3">
            <Input name="confirmEmail" placeholder={user.email} required className="h-11" />
            <Input name="code" placeholder="6-digit code" required className="h-11" />
            <SubmitButton variant="destructive">Delete my account</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
