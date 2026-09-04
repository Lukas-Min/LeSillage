"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

/**
 * Adopts a signed-in customer's account-saved theme once per sign-in — so a
 * fresh browser/device that has no localStorage value yet still opens in the
 * theme they picked elsewhere, instead of always defaulting to "system".
 * Runs only once per user id (not on every render) so it never stomps on a
 * theme change made later in the same session — that flows the other way,
 * from ThemeToggle back up to the account, via updateThemePreference.
 */
export function AccountThemeSync() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const syncedForUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId || syncedForUserId.current === userId) return;
    syncedForUserId.current = userId;
    const themePreference = (session?.user as { themePreference?: string | null } | undefined)?.themePreference;
    if (themePreference) setTheme(themePreference);
  }, [session, setTheme]);

  return null;
}
