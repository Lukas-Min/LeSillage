import { requestPasswordReset } from "@/actions/auth-credentials-actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = authErrorMessage(params.error, params.msg);
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If an account exists, we will email a 6-digit reset code.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6">
          <form action={requestPasswordReset} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="h-11" />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <SubmitButton className="h-11 w-full rounded-md" variant="gold" pendingLabel="Sending…">
              Send code
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
