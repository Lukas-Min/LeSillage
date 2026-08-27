"use client";

import Link from "next/link";
import { signInWithPassword } from "@/actions/auth-credentials-actions";
import { OAuthButton } from "@/components/store/oauth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignInForm({
  returnTo,
  error,
}: {
  returnTo: string;
  error?: string;
}) {
  return (
    <Card className="mt-6">
      <CardContent className="space-y-4 p-6">
        <form action={signInWithPassword} className="space-y-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11" />
          </div>
          {error ? <p className="text-sm text-destructive">Sign-in failed. Check your email and password.</p> : null}
          <SubmitButton className="h-11 w-full rounded-md" variant="gold" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="text-center text-xs">
          <Link href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`} className="underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </p>
        <div className="space-y-2">
          <OAuthButton provider="google" returnTo={returnTo} />
          <OAuthButton provider="facebook" returnTo={returnTo} />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/policies" className="underline-offset-4 hover:underline">
            policies
          </Link>
          .
        </p>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/shop">Continue browsing as guest</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
