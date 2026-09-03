"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  addItemToCart,
  changeCartItemSize,
  checkGuestCartMerge,
  clearCart,
  getCart,
  importLegacyCart,
  mergeGuestCartIntoUser,
  removeCartItem,
  resolveGuestCartConflict,
  updateCartItem,
} from "@/actions/cart-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CartLineView, CartView, GuestCartMergeState } from "@/lib/cart";

export type CartItem = CartLineView;

const EMPTY: CartView = {
  items: [],
  count: 0,
  totals: {
    merchandiseSubtotalCentavos: 0,
    discountCentavos: 0,
    orderDiscountCentavos: 0,
    deliveryDiscountCentavos: 0,
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
  clear: () => Promise<void>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "le-sillage-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CartView>(EMPTY);
  const { data: session, status } = useSession();
  // Debounced quantity edits can have two updateCartItem calls in flight at
  // once; a slower-resolving stale one must not overwrite a newer one.
  const quantityRequestIdRef = useRef(0);
  const mergeFlagKey = "lesillage.guestCartMerged";
  // Set only once the guest cart is actually resolved (auto-merged, or the
  // conflict dialog below is answered) — not before, so an interrupted
  // conflict (e.g. the tab closes mid-decision) is asked again next time.
  const [conflict, setConflict] = useState<GuestCartMergeState | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(mergeFlagKey) === "1") {
        void getCart().then(setView);
        return;
      }
      void checkGuestCartMerge().then((state) => {
        if (state.hasConflict) {
          // Show the current account cart while the user decides — the
          // guest cart stays untouched either way until they answer.
          setConflict(state);
          void getCart().then(setView);
          return;
        }
        window.sessionStorage.setItem(mergeFlagKey, "1");
        void mergeGuestCartIntoUser().then(() => {
          void getCart().then(setView);
        });
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

  const resolveConflict = useCallback(async (strategy: "keep-account" | "use-guest") => {
    setResolving(true);
    try {
      const next = await resolveGuestCartConflict(strategy);
      setView(next);
      setConflict(null);
      if (typeof window !== "undefined") window.sessionStorage.setItem(mergeFlagKey, "1");
    } finally {
      setResolving(false);
    }
  }, []);

  const add = useCallback(async (item: Pick<CartLineView, "skuId"> & { quantity: number }) => {
    setView(await addItemToCart(item.skuId, item.quantity));
  }, []);

  const setQuantity = useCallback(async (skuId: string, quantity: number) => {
    const requestId = ++quantityRequestIdRef.current;
    const next = await updateCartItem(skuId, quantity);
    if (requestId === quantityRequestIdRef.current) setView(next);
  }, []);

  const remove = useCallback(async (skuId: string) => {
    setView(await removeCartItem(skuId));
  }, []);

  const changeSize = useCallback(async (fromSkuId: string, toSkuId: string) => {
    setView(await changeCartItemSize(fromSkuId, toSkuId));
  }, []);

  const clear = useCallback(async () => {
    setView(await clearCart());
  }, []);

  const value = useMemo(
    () => ({ items: view.items, totals: view.totals, add, setQuantity, remove, changeSize, clear, count: view.count }),
    [view, add, setQuantity, remove, changeSize, clear],
  );
  return (
    <CartContext.Provider value={value}>
      {children}
      <AlertDialog open={conflict !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Two bags, one account</AlertDialogTitle>
            <AlertDialogDescription>
              {conflict
                ? `Your account already has ${conflict.userCount} item${conflict.userCount === 1 ? "" : "s"} in its bag, and you also have ${conflict.guestCount} item${conflict.guestCount === 1 ? "" : "s"} from before signing in. Which one do you want to keep?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving} onClick={() => void resolveConflict("keep-account")}>
              Use my account bag
            </AlertDialogCancel>
            <AlertDialogAction disabled={resolving} onClick={() => void resolveConflict("use-guest")}>
              Use my current bag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CartContext.Provider>
  );
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
