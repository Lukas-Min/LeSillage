import { requestPasswordReset } from "@/actions/auth-credentials-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default function ForgotPasswordPage() {
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
            <SubmitButton className="h-11 w-full" pendingLabel="Sending…">
              Send code
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
