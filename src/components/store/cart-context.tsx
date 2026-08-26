"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  skuId: string;
  name: string;
  skuLabel: string;
  retailPriceCentavos: number;
  fulfillment: "PRE_ORDER" | "ON_HAND";
  quantity: number;
  productType: "FULL_BOTTLE" | "PARTIAL" | "DECANT";
}

interface CartContextValue {
  items: CartItem[];
  add: (item: CartItem) => Promise<void>;
  setQuantity: (skuId: string, quantity: number) => Promise<void>;
  remove: (skuId: string) => Promise<void>;
  clear: () => Promise<void>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "le-sillage-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        Promise.resolve().then(() => setItems(parsed));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback(async (item: CartItem) => {
    setItems((current) => {
      const existing = current.find((c) => c.skuId === item.skuId);
      if (existing) {
        return current.map((c) => (c.skuId === item.skuId ? { ...c, quantity: c.quantity + item.quantity } : c));
      }
      return [...current, item];
    });
  }, []);

  const setQuantity = useCallback(async (skuId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((c) => (c.skuId === skuId ? { ...c, quantity } : c))
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const remove = useCallback(async (skuId: string) => {
    setItems((current) => current.filter((c) => c.skuId !== skuId));
  }, []);

  const clear = useCallback(async () => {
    setItems([]);
  }, []);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count }), [items, add, setQuantity, remove, clear, count]);
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