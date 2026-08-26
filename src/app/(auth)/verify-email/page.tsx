import { resendSignupCode, verifyEmailCode } from "@/actions/auth-credentials-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const returnTo = params.returnTo && params.returnTo.startsWith("/") ? params.returnTo : "/account";
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to {email || "your inbox"}.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <form action={verifyEmailCode} className="space-y-3">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" inputMode="numeric" required maxLength={6} className="h-11 tracking-[0.4em]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password (to sign you in)</Label>
              <Input id="password" name="password" type="password" className="h-11" />
            </div>
            <SubmitButton className="h-11 w-full" pendingLabel="Verifying…">
              Verify
            </SubmitButton>
          </form>
          <form action={resendSignupCode}>
            <input type="hidden" name="email" value={email} />
            <SubmitButton variant="ghost" className="w-full" pendingLabel="Sending…">
              Resend code
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
