"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSiblingSkuOptions } from "@/actions/cart-actions";
import { useCart } from "@/components/store/cart-context";
import { Price } from "@/components/store/price";
import { SizePicker, type SizePickerOption } from "@/components/store/size-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartLineView } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function CartLineItem({
  item,
  layout = "drawer",
}: {
  item: CartLineView;
  layout?: "drawer" | "page";
}) {
  const cart = useCart();
  const [customizing, setCustomizing] = useState(false);
  const [siblings, setSiblings] = useState<SizePickerOption[] | null>(null);
  const [loadingSiblings, startLoadSiblings] = useTransition();
  const [swapping, startSwap] = useTransition();

  function toggleCustomize() {
    if (customizing) {
      setCustomizing(false);
      return;
    }
    setCustomizing(true);
    if (siblings) return;
    startLoadSiblings(async () => {
      try {
        setSiblings(await getSiblingSkuOptions(item.skuId));
      } catch {
        setSiblings([]);
        toast.error("Could not load sizes");
      }
    });
  }

  function handleSelect(option: SizePickerOption) {
    if (option.skuId === item.skuId) {
      setCustomizing(false);
      return;
    }
    startSwap(async () => {
      try {
        await cart.changeSize(item.skuId, option.skuId);
        setCustomizing(false);
        setSiblings(null); // prices/stock may have moved — refetch next time
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not change size");
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

  return (
    <div
      className={cn(
        "rounded-md border border-border p-3",
        layout === "page" && "sm:flex sm:items-center sm:gap-4 sm:p-4",
      )}
    >
      <div className="flex-1">
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
              onClick={toggleCustomize}
            >
              Customize
            </Button>
          ) : null}
        </div>
        <Price
          originalCentavos={item.originalUnitCentavos}
          discountedCentavos={item.retailPriceCentavos}
          quantity={item.quantity}
          className="mt-1 block"
        />
        {customizing ? (
          <div className="mt-2 border-t border-border/60 pt-2">
            {loadingSiblings || siblings === null ? (
              <p className="text-xs text-muted-foreground">Loading sizes…</p>
            ) : (
              <SizePicker
                density="compact"
                options={siblings}
                selectedSkuId={item.skuId}
                onSelect={handleSelect}
                className={swapping ? "pointer-events-none opacity-50" : undefined}
              />
            )}
          </div>
        ) : null}
        {outOfStock ? <p className="mt-1 text-xs text-destructive">Out of stock</p> : null}
      </div>
      <div className="mt-2 flex items-center gap-2 sm:mt-0">
        <Input
          type="number"
          min={1}
          max={item.maxQuantity}
          value={item.quantity}
          disabled={outOfStock}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) void cart.setQuantity(item.skuId, next);
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
    </div>
  );
}
