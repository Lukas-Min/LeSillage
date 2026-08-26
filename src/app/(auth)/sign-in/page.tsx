import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAuthButton } from "@/components/store/oauth-button";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const returnTo = params.returnTo && params.returnTo.startsWith("/") ? params.returnTo : "/";
  if (session?.user) redirect(returnTo);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Sign in to Le Sillage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use Google or Facebook. We never store your password.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <OAuthButton provider="google" returnTo={returnTo} />
          <OAuthButton provider="facebook" returnTo={returnTo} />
          {params.error ? (
            <p className="text-sm text-destructive">Sign-in failed. Please try again.</p>
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
      <Button asChild variant="ghost" className="mt-4">
        <Link href="/shop">Continue browsing as guest</Link>
      </Button>
    </main>
  );
}