"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addItemToCart,
  getCart,
  importLegacyCart,
  removeCartItem,
  updateCartItem,
} from "@/actions/cart-actions";
import type { CartLineView, CartView } from "@/lib/cart";

export type CartItem = CartLineView;

const EMPTY: CartView = {
  items: [],
  count: 0,
  totals: {
    merchandiseSubtotalCentavos: 0,
    discountCentavos: 0,
    decantSubtotalCentavos: 0,
    deliveryFeeCentavos: 0,
    totalCentavos: 0,
    freeShipping: false,
    testerBonusEligible: false,
    defaultDeliveryFeeCentavos: 12000,
  },
};

interface CartContextValue {
  items: CartLineView[];
  totals: CartView["totals"];
  add: (item: Pick<CartLineView, "skuId"> & { quantity: number }) => Promise<void>;
  setQuantity: (skuId: string, quantity: number) => Promise<void>;
  remove: (skuId: string) => Promise<void>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "le-sillage-cart";

export function CartProvider({
  children,
  initialCart,
}: {
  children: React.ReactNode;
  initialCart?: CartView;
}) {
  const [view, setView] = useState<CartView>(initialCart ?? EMPTY);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Array<{ skuId: string; quantity: number }>;
      window.localStorage.removeItem(STORAGE_KEY);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      void importLegacyCart(parsed.map((line) => ({ skuId: line.skuId, quantity: line.quantity }))).then(
        setView,
      );
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const add = useCallback(async (item: Pick<CartLineView, "skuId"> & { quantity: number }) => {
    setView(await addItemToCart(item.skuId, item.quantity));
  }, []);

  const setQuantity = useCallback(async (skuId: string, quantity: number) => {
    setView(await updateCartItem(skuId, quantity));
  }, []);

  const remove = useCallback(async (skuId: string) => {
    setView(await removeCartItem(skuId));
  }, []);

  const value = useMemo(
    () => ({ items: view.items, totals: view.totals, add, setQuantity, remove, count: view.count }),
    [view, add, setQuantity, remove],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function useCartCount(): number {
  return useCart().count;
}

export async function refreshCartFromServer(setView: (view: CartView) => void) {
  setView(await getCart());
}
