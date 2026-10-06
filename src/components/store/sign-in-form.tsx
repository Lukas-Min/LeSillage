"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signInWithPassword } from "@/actions/auth-credentials-actions";
import { OAuthButton } from "@/components/store/oauth-button";
import type { OAuthProvider } from "@/lib/oauth-provider-label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const REMEMBER_ME_STORAGE_KEY = "le-sillage-remember-me";
const REMEMBERED_EMAIL_KEY = "le-sillage-remembered-email";

export function SignInForm({
  returnTo,
  errorMessage,
  defaultEmail,
  providers,
}: {
  returnTo: string;
  errorMessage?: string | null;
  defaultEmail?: string;
  providers: OAuthProvider[];
}) {
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState(defaultEmail ?? "");

  useEffect(() => {
    const storedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
    const storedChoice = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
    if (defaultEmail) {
      setEmail(defaultEmail);
      return;
    }
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
      return;
    }
    if (storedChoice === "0") setRememberMe(false);
  }, [defaultEmail]);

  function onRememberMeChange(next: boolean) {
    setRememberMe(next);
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, next ? "1" : "0");
    if (!next) window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }

  function rememberEmail() {
    const value = email.trim().toLowerCase();
    if (rememberMe && value) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
      window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, "1");
      return;
    }
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, "0");
  }

  return (
    <Card className="mt-6">
      <CardContent className="space-y-4 p-6">
        <form action={signInWithPassword} className="space-y-3" onSubmit={rememberEmail}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="rememberMe" value={rememberMe ? "1" : "0"} />
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="rememberMe" className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => onRememberMeChange(checked === true)}
              />
              Remember me
            </label>
            <Link
              href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}
              className="shrink-0 text-xs underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <SubmitButton className="h-11 w-full rounded-md" variant="gold" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        {providers.length > 0 ? (
          <>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              Or
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              {providers.map((provider) => (
                <OAuthButton key={provider} provider={provider} returnTo={returnTo} rememberMe={rememberMe} />
              ))}
            </div>
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/policies" className="underline-offset-4 hover:underline">
            policies
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
