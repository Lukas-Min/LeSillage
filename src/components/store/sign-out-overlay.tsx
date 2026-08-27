"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "outline",
  className,
  children = "Sign out",
}: {
  variant?: "default" | "outline" | "ghost" | "destructive";
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut({ callbackUrl: "/" });
        }}
      >
        <LogOut className="h-4 w-4" />
        {children}
      </Button>
      {pending ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Signing out…</p>
        </div>
      ) : null}
    </>
  );
}
