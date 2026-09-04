"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateThemePreference } from "@/actions/theme-actions";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // resolvedTheme is unknown until mounted (next-themes reads it from
  // localStorage/system client-side only) — render a same-size placeholder
  // instead of guessing, to avoid a hydration mismatch or an icon flash.
  if (!mounted) {
    return <span className={cn("inline-block h-11 w-11", className)} aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Also save to the account (if signed in) so it follows across devices —
    // a no-op server-side for guests. Local (localStorage, via next-themes)
    // already works regardless of sign-in state.
    if (status === "authenticated") void updateThemePreference(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("min-h-11 min-w-11", className)}
      onClick={toggle}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
