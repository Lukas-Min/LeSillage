"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const selectClass = "h-11 w-full rounded-lg border bg-background px-3 text-sm";

/**
 * Provenance/Fulfillment/Stock for one decant SKU, as a single client
 * island: only a RETAIL decant (bought pre-made from the perfumery) has its
 * own real stock — an IN_HOUSE decant (poured from a whole bottle) is
 * always derived from the product's shared remainingMl pool above, so
 * Fulfillment/Stock only make sense to show and edit when Provenance is
 * switched to Retail. Everything else on the SKU form stays server-rendered
 * plain HTML; only this one field group needs to react live to another
 * field's value.
 */
export function DecantSkuFields({
  idPrefix,
  initialProvenance,
  fulfillment,
  stock,
  costPrice,
  retailPrice,
}: {
  idPrefix: string;
  initialProvenance: "RETAIL" | "IN_HOUSE" | "TESTER";
  fulfillment: "ON_HAND" | "PRE_ORDER";
  stock: number;
  /** In pesos (already converted from centavos), like every other admin
   *  money field — only meaningful/editable when Provenance is Retail. */
  costPrice: number;
  retailPrice: number;
}) {
  const [provenance, setProvenance] = useState<"RETAIL" | "IN_HOUSE" | "TESTER">(initialProvenance);
  const isRetail = provenance === "RETAIL";

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-provenance`}>Provenance</Label>
        <select
          id={`${idPrefix}-provenance`}
          name="provenance"
          value={provenance}
          onChange={(event) => setProvenance(event.target.value as "RETAIL" | "IN_HOUSE")}
          className={selectClass}
        >
          <option value="IN_HOUSE">In-house — poured from a whole bottle</option>
          <option value="RETAIL">Retail — bought pre-made as a decant</option>
        </select>
      </div>
      {isRetail ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-fulfillment`}>Fulfillment</Label>
            <select id={`${idPrefix}-fulfillment`} name="fulfillment" defaultValue={fulfillment} className={selectClass}>
              <option value="ON_HAND">On hand</option>
              <option value="PRE_ORDER">Pre-order</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-stock`}>Stock</Label>
            <Input id={`${idPrefix}-stock`} name="stock" type="number" defaultValue={stock} />
          </div>
          {/* A retail decant is bought pre-made — its cost/price aren't
              derived from the product's whole-bottle reference formula, so
              they're entered directly here instead. */}
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-cost`}>Cost price (₱)</Label>
            <Input
              id={`${idPrefix}-cost`}
              name="manualCostPrice"
              type="number"
              step="0.01"
              defaultValue={costPrice || ""}
              placeholder="e.g. 250"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-price`}>Retail price (₱)</Label>
            <Input
              id={`${idPrefix}-price`}
              name="manualRetailPrice"
              type="number"
              step="0.01"
              defaultValue={retailPrice || ""}
              placeholder="e.g. 450"
              required
            />
          </div>
        </>
      ) : (
        <>
          {/* In-house: fulfillment/stock are derived from the ml pool, and
              price from the product's reference formula — nothing here is
              edited directly. Preserved as hidden inputs so switching back
              and forth (or just saving) doesn't disturb the stored columns. */}
          <input type="hidden" name="fulfillment" value={fulfillment} />
          <input type="hidden" name="stock" value={stock} />
          <div className="space-y-1 sm:col-span-2">
            <p className="flex h-11 items-center text-sm text-muted-foreground">
              Fulfillment, stock, and price are derived from the remaining ml pool / reference price above.
            </p>
          </div>
        </>
      )}
    </>
  );
}
