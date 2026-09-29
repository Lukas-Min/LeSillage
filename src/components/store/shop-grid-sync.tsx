"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SHOP_COLS_COOKIE, THREE_COLUMN_QUERY } from "@/lib/shop-grid";

/**
 * Keeps the `shop_cols` cookie in step with the shop grid's real column
 * count, so the server can pick 21 cards per page when the grid is three
 * wide (see src/lib/shop-grid.ts). `threeColumns` is what the server used
 * for this render; when the screen disagrees (first visit, or a resize
 * across a breakpoint) this writes the cookie and refreshes once. The
 * refresh only happens after the cookie write is confirmed, so a browser
 * that blocks cookies just keeps the 20-card default instead of looping.
 */
export function ShopGridSync({ threeColumns }: { threeColumns: boolean }) {
  const router = useRouter();
  const lastRequested = useRef<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(THREE_COLUMN_QUERY);
    function sync() {
      const now = query.matches;
      if (now === threeColumns || lastRequested.current === now) return;
      const value = now ? "3" : "other";
      document.cookie = `${SHOP_COLS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
      if (!document.cookie.split("; ").includes(`${SHOP_COLS_COOKIE}=${value}`)) return;
      lastRequested.current = now;
      router.refresh();
    }
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [threeColumns, router]);

  return null;
}
