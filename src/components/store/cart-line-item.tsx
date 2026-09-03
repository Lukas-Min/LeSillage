"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSiblingSkuOptions } from "@/actions/cart-actions";
import { useCart } from "@/components/store/cart-context";
import { Price } from "@/components/store/price";
import { SizePicker, type SizePickerOption } from "@/components/store/size-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPHP } from "@/domain/money";
import type { CartLineView } from "@/lib/cart";
import { cn } from "@/lib/utils";

const QUANTITY_DEBOUNCE_MS = 500;

export function CartLineItem({
  item,
  layout = "drawer",
}: {
  item: CartLineView;
  layout?: "drawer" | "page";
}) {
  const cart = useCart();

  // Local, instantly-updated quantity — the server call is debounced so
  // typing doesn't fire a request (and a full cart reload) per keystroke.
  // Resyncing when the server-confirmed quantity/sku changes (e.g. after the
  // debounced call lands, or a size swap) is done during render — React's
  // documented pattern for "adjust state when a prop changes" — rather than
  // an effect, which would cascade an extra render on every sync.
  const [qty, setQtyLocal] = useState(item.quantity);
  const [syncedKey, setSyncedKey] = useState(`${item.skuId}:${item.quantity}`);
  const currentKey = `${item.skuId}:${item.quantity}`;
  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey);
    setQtyLocal(item.quantity);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function handleQtyChange(next: number) {
    setQtyLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void cart.setQuantity(item.skuId, next);
    }, QUANTITY_DEBOUNCE_MS);
  }

  // Customize: picking a size only stages it locally — nothing is sent to
  // the server (and nothing re-fetches the cart) until Save is clicked.
  const [customizing, setCustomizing] = useState(false);
  const [siblings, setSiblings] = useState<SizePickerOption[] | null>(null);
  const [stagedSkuId, setStagedSkuId] = useState(item.skuId);
  const [loadingSiblings, startLoadSiblings] = useTransition();
  const [saving, startSave] = useTransition();

  function openCustomize() {
    if (customizing) return;
    setCustomizing(true);
    setStagedSkuId(item.skuId);
    if (siblings) return;
    startLoadSiblings(async () => {
      try {
        setSiblings(await getSiblingSkuOptions(item.skuId));
      } catch {
        setSiblings([]);
        toast.error("Could not load sizes", { id: `cart-customize-${item.skuId}` });
      }
    });
  }

  function cancelCustomize() {
    setCustomizing(false);
    setStagedSkuId(item.skuId);
  }

  function saveCustomize() {
    if (!stagedSkuId || stagedSkuId === item.skuId) {
      setCustomizing(false);
      return;
    }
    startSave(async () => {
      try {
        await cart.changeSize(item.skuId, stagedSkuId);
        setCustomizing(false);
        setSiblings(null); // prices/stock may have moved — refetch next time
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not change size", {
          id: `cart-customize-${item.skuId}`,
        });
      }
    });
  }

  if (!item.available) {
    return (
      <div className={cn("rounded-md border border-dashed border-border p-3", layout === "page" && "sm:p-4")}>
        <p className="text-sm text-muted-foreground">{item.name} is no longer available.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-8 px-2 text-xs"
          onClick={() => void cart.remove(item.skuId)}
        >
          Remove
        </Button>
      </div>
    );
  }

  const outOfStock = item.maxQuantity <= 0;

  // While a different size is staged (not yet saved), preview its price —
  // same as the product page's buy box, which updates the price the moment
  // a size is picked rather than only after committing.
  const stagedOption = customizing ? (siblings?.find((o) => o.skuId === stagedSkuId) ?? null) : null;
  const displayOriginal = stagedOption?.originalCentavos ?? item.originalUnitCentavos;
  const displayDiscounted = stagedOption?.discountedCentavos ?? item.retailPriceCentavos;

  return (
    <div
      className={cn(
        "rounded-md border border-border p-3",
        layout === "page" && "sm:flex sm:items-center sm:gap-4 sm:p-4",
      )}
    >
      <div className="flex-1 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif-display text-base leading-tight">{item.name}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {item.skuLabel} · {item.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </p>
            </div>
            {item.productType === "DECANT" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-[11px] uppercase tracking-[0.15em]"
                disabled={saving}
                onClick={customizing ? cancelCustomize : openCustomize}
              >
                {customizing ? "Cancel" : "Customize"}
              </Button>
            ) : null}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xs text-muted-foreground">{formatPHP(displayDiscounted)} each</p>
            <Price
              originalCentavos={displayOriginal}
              discountedCentavos={displayDiscounted}
              quantity={qty}
              suffix="total"
              className="text-right"
            />
          </div>
        </div>

        {customizing ? (
          <div className="border-t border-border/60 pt-3">
            {loadingSiblings || siblings === null ? (
              <p className="text-xs text-muted-foreground">Loading sizes…</p>
            ) : (
              <SizePicker
                density="compact"
                options={siblings}
                selectedSkuId={stagedSkuId}
                onSelect={(option) => setStagedSkuId(option.skuId)}
                className={saving ? "pointer-events-none opacity-50" : undefined}
              />
            )}
          </div>
        ) : null}

        {outOfStock ? <p className="text-xs text-destructive">Out of stock</p> : null}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={item.maxQuantity}
              value={qty}
              disabled={outOfStock}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) handleQtyChange(next);
              }}
              className="h-11 w-16 rounded-md"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item.name}`}
              className="min-h-11 min-w-11"
              onClick={() => void cart.remove(item.skuId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {customizing ? (
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={saving || loadingSiblings}
              onClick={saveCustomize}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
