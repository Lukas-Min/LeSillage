"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function OAuthButton({
  provider,
  returnTo,
}: {
  provider: "google" | "facebook";
  returnTo: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-md"
      onClick={() => signIn(provider, { callbackUrl: returnTo })}
    >
      Continue with {provider === "google" ? "Google" : "Facebook"}
    </Button>
  );
}