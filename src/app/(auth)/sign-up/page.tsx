import Link from "next/link";
import { registerWithEmail } from "@/actions/auth-credentials-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params.returnTo && params.returnTo.startsWith("/") ? params.returnTo : "/account";
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We will email a 6-digit code to verify your address.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6">
          <form action={registerWithEmail} className="space-y-3">
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required minLength={2} className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={10} className="h-11" />
              <p className="text-xs text-muted-foreground">At least 10 characters, with a letter and a number.</p>
            </div>
            <SubmitButton className="h-11 w-full rounded-md" variant="gold" pendingLabel="Creating…">
              Create account
            </SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
