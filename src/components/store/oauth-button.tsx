"use client";

import { startOAuthSignIn } from "@/actions/auth-actions";
import { FacebookIcon, GoogleIcon } from "@/components/store/brand-icons";
import { Button } from "@/components/ui/button";

export function OAuthButton({
  provider,
  returnTo,
  rememberMe = true,
}: {
  provider: "google" | "facebook";
  returnTo: string;
  rememberMe?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-md"
      onClick={() => startOAuthSignIn(provider, returnTo, rememberMe)}
    >
      {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : <FacebookIcon className="h-4 w-4" />}
      Continue with {provider === "google" ? "Google" : "Facebook"}
    </Button>
  );
}