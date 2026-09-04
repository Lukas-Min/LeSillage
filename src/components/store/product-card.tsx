"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CatalogPrice, Price } from "@/components/store/price";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { BuyNowButton } from "@/components/store/buy-now-button";
import { SizePicker } from "@/components/store/size-picker";
import { concentrationLabel } from "@/domain/concentration";
import { labelForCategory, labelForType } from "@/domain/product-type";
import { capitalizeFirst } from "@/lib/utils";
import type { CatalogCardModel } from "@/lib/catalog";

export function ProductCard({ card }: { card: CatalogCardModel }) {
  const concentration = concentrationLabel(card.concentration);
  const genderLabel = card.gender ? capitalizeFirst(card.gender) : null;
  const subtitle =
    [card.family, concentration, genderLabel].filter(Boolean).join(" · ") || labelForType(card.type);
  const isDecant = card.type === "DECANT" && card.sizeOptions.length > 0;
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const selected = isDecant ? card.sizeOptions.find((o) => o.skuId === selectedSkuId) ?? null : null;
  const activeSkuId = isDecant ? (selectedSkuId ?? "") : card.skuId;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_44px_-28px_rgba(31,28,24,0.4)]">
      <Link href={card.href} className="flex flex-1 flex-col">
        <div className="relative overflow-hidden">
          {card.ratingValue ? (
            <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-none bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm">
              <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" />
              {card.ratingValue.toFixed(1)}
            </span>
          ) : null}
          {card.savePercent && card.savePercent > 0 ? (
            <span className="absolute right-2 top-2 z-10 rounded-none bg-gold px-2 py-1 text-[11px] font-medium text-charcoal shadow-sm">
              Save {card.savePercent}%
            </span>
          ) : null}
          <span className="absolute left-2 bottom-2 z-10 inline-flex items-center rounded-none bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur-sm">
            {labelForCategory(card.fragranceCategory)}
          </span>
          <CompositionCanvas
            brand={card.brand}
            name={card.name}
            pyramid={card.notePyramid}
            imageUrl={card.imageUrl}
            imageAlt={card.imageAlt}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{card.brand}</p>
          <h2 className="font-serif-display line-clamp-2 text-lg leading-snug font-semibold">
            {card.name}
          </h2>
          <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-auto space-y-3 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </Badge>
              {/* Condition ("Sealed", "A few sprays missing"...) and
                  provenance ("Retail"/"Tester") only mean something for a
                  specific physical bottle — a decant is poured to order from
                  a shared pool, so neither applies. */}
              {card.type !== "DECANT" ? (
                <>
                  <Badge variant="outline">{card.conditionLabel}</Badge>
                  <Badge variant="outline">{card.provenanceLabel}</Badge>
                </>
              ) : null}
              {card.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            </div>
            {isDecant ? (
              <SizePicker
                density="compact"
                options={card.sizeOptions}
                selectedSkuId={selectedSkuId}
                onSelect={(option) => setSelectedSkuId(option.skuId)}
              />
            ) : null}
            <div className="border-t border-border/60 pt-3">
              {selected ? (
                <Price
                  originalCentavos={selected.originalCentavos}
                  discountedCentavos={selected.discountedCentavos}
                  savedCentavos={selected.savedCentavos}
                  className="block text-right"
                />
              ) : (
                <CatalogPrice
                  minOriginalCentavos={card.minOriginalCentavos}
                  maxOriginalCentavos={card.maxOriginalCentavos}
                  minDiscountedCentavos={card.minDiscountedCentavos}
                  maxDiscountedCentavos={card.maxDiscountedCentavos}
                  savePercent={card.savePercent}
                  align="right"
                  showSaveBadge={false}
                />
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <AddToCartButton
          skuId={activeSkuId}
          variant="compact"
          soldOut={card.soldOut}
          disabled={isDecant && !selectedSkuId}
        />
        <BuyNowButton
          skuId={activeSkuId}
          quantity={1}
          soldOut={card.soldOut}
          disabled={isDecant && !selectedSkuId}
        />
      </div>
    </article>
  );
}
