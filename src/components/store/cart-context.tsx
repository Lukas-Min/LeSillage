"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  addItemToCart,
  changeCartItemSize,
  getCart,
  importLegacyCart,
  mergeGuestCartIntoUser,
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
  changeSize: (fromSkuId: string, toSkuId: string) => Promise<void>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "le-sillage-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CartView>(EMPTY);
  const { data: session, status } = useSession();
  const mergeFlagKey = "lesillage.guestCartMerged";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(mergeFlagKey) === "1") {
        void getCart().then(setView);
        return;
      }
      window.sessionStorage.setItem(mergeFlagKey, "1");
      void mergeGuestCartIntoUser().then(() => {
        void getCart().then(setView);
      });
      return;
    }
    void getCart().then(setView);
  }, [status]);

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

  const changeSize = useCallback(async (fromSkuId: string, toSkuId: string) => {
    setView(await changeCartItemSize(fromSkuId, toSkuId));
  }, []);

  const value = useMemo(
    () => ({ items: view.items, totals: view.totals, add, setQuantity, remove, changeSize, count: view.count }),
    [view, add, setQuantity, remove, changeSize],
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
