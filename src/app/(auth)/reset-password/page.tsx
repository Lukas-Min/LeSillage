import { completePasswordReset } from "@/actions/auth-credentials-actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; msg?: string }>;
}) {
  const { email = "", error, msg } = await searchParams;
  const errorMessage = authErrorMessage(error, msg);
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Choose a new password</h1>
      <Card className="mt-6">
        <CardContent className="p-6">
          <form action={completePasswordReset} className="space-y-3">
            <input type="hidden" name="email" value={email} />
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" inputMode="numeric" required maxLength={6} className="h-11 tracking-[0.4em]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={10} className="h-11" />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <SubmitButton className="h-11 w-full rounded-md" variant="gold" pendingLabel="Saving…">
              Update password
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
