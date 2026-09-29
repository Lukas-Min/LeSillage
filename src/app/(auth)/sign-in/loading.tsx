import Link from "next/link";
import { FacebookIcon, GoogleIcon } from "@/components/store/brand-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configuredOAuthProviders, oauthProviderLabel } from "@/lib/oauth-providers";

export default function SignInLoading() {
  const providers = configuredOAuthProviders();
  const providerNames = providers.map(oauthProviderLabel).join(" or ");
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Sign in to Le Sillage Manila</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {providerNames ? `Use email and password, or continue with ${providerNames}.` : "Use email and password."}
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" disabled className="h-11" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="rememberMe" className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox id="rememberMe" defaultChecked disabled />
                Remember me
              </label>
              <span className="shrink-0 text-xs">Forgot password?</span>
            </div>
            <Button type="button" disabled className="h-11 w-full rounded-md" variant="gold">
              Sign in
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            New here? <span>Create an account</span>
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
                  <Button key={provider} type="button" disabled variant="outline" className="w-full rounded-md">
                    {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : <FacebookIcon className="h-4 w-4" />}
                    Continue with {oauthProviderLabel(provider)}
                  </Button>
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
    </main>
  );
}
