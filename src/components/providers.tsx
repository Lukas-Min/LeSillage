"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/store/cart-context";
import { AccountThemeSync } from "@/components/account-theme-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <AccountThemeSync />
        <CartProvider>{children}</CartProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
