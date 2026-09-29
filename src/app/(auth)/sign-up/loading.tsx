import { FacebookIcon, GoogleIcon } from "@/components/store/brand-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configuredOAuthProviders, oauthProviderLabel } from "@/lib/oauth-providers";

export default function SignUpLoading() {
  const providers = configuredOAuthProviders();
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We will email a 6-digit code to verify your address.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" disabled className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" disabled className="h-11" />
              <p className="text-xs text-muted-foreground">At least 6 characters, with a letter and a number.</p>
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" disabled className="mt-1 size-4 shrink-0 accent-current" />
              <span>
                <span className="font-medium">Send me news and promotions</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Occasional updates about new fragrances, restocks, and limited offers. No more than once a week.
                </span>
              </span>
            </label>
            <Button type="button" disabled className="h-11 w-full rounded-md" variant="gold">
              Create account
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <span>Sign in</span>
          </p>
          {providers.length > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                Or
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-2">
                {providers.map((provider) => (
                  <Button key={provider} type="button" disabled variant="outline" className="w-full rounded-md">
                    {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : <FacebookIcon className="h-4 w-4" />}
                    Continue with {oauthProviderLabel(provider)}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
