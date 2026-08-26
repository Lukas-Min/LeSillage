"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/store/cart-context";
import type { CartView } from "@/lib/cart";

export function Providers({
  children,
  initialCart,
}: {
  children: React.ReactNode;
  initialCart?: CartView;
}) {
  return (
    <SessionProvider>
      <CartProvider initialCart={initialCart}>{children}</CartProvider>
    </SessionProvider>
  );
}
