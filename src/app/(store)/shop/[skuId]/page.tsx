import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, promoSettings } from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { concentrationLabel, guessConcentration, sizeOnlyLabel } from "@/domain/concentration";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { BuyBox } from "@/components/store/buy-box";
import { AccordStrip } from "@/components/store/accord-strip";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { WishlistButton } from "@/components/store/wishlist-button";
import { DecantBuyBox } from "@/components/store/decant-buy-box";
import type { SizePickerOption } from "@/components/store/size-picker";
import { labelForCategory, labelForCondition, labelForType } from "@/domain/product-type";
import { productAccords } from "@/lib/product-accords";
import { policyCopy } from "@/lib/policy-copy";
import { normaliseNotePyramid } from "@/lib/note-pyramid";
import { capitalizeFirst, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ skuId: string }> }) {
  const { skuId } = await params;
  const client = db();
  const row = (
    await client
      .select({
        productId: products.id,
        name: products.name,
        brand: products.brand,
        family: products.family,
        fragranceCategory: products.fragranceCategory,
        concentration: products.concentration,
        gender: products.gender,
        type: products.type,
        description: products.description,
        notes: products.notes,
        remainingMl: products.remainingMl,
        notePyramid: products.notePyramid,
        accords: products.accords,
        perfumers: products.perfumers,
        longevity: products.longevity,
        seasonBreakout: products.seasonBreakout,
        condition: skus.condition,
        skuId: skus.id,
        skuLabel: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isTester: skus.isTester,
        isActive: skus.isActive,
        productActive: products.isActive,
      })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!row || row.isTester || !row.isActive || !row.productActive) return notFound();

  const [discounts, siblings, promoRow, image] = await Promise.all([
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, row.productId)),
    client
      .select({
        id: skus.id,
        label: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        condition: skus.condition,
      })
      .from(skus)
      .where(and(eq(skus.productId, row.productId), eq(skus.isActive, true), eq(skus.isTester, false))),
    client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
    client
      .select({ url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, row.productId))
      .orderBy(asc(productImages.position))
      .limit(1),
  ]);

  const threshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const remainingMl = row.remainingMl ?? 0;
  const fulfillment =
    row.type === "DECANT"
      ? decantFulfillment({
          remainingMl,
          sizeMl: row.sizeMl ?? DECANT_SIZES_ML[0],
          thresholdMl: threshold,
        })
      : row.fulfillment;
  const soldOut = row.type !== "DECANT" && fulfillment === "ON_HAND" && row.stock <= 0;
  const discount = bestDiscount(discounts, row.retailPrice);
  const { discountedUnitCentavos, perUnitDiscountCentavos } = applyDiscount(row.retailPrice, discount);
  const decantOptions: SizePickerOption[] = siblings
    .filter((s) => s.sizeMl != null)
    .sort((a, b) => (a.sizeMl ?? 0) - (b.sizeMl ?? 0))
    .map((match) => {
      const sizeDiscount = bestDiscount(discounts, match.retailPrice);
      const applied = applyDiscount(match.retailPrice, sizeDiscount);
      return {
        sizeMl: match.sizeMl!,
        label: `${match.sizeMl}ML`,
        skuId: match.id,
        fulfillment: decantFulfillment({ remainingMl, sizeMl: match.sizeMl!, thresholdMl: threshold }),
        condition: match.condition,
        originalCentavos: match.retailPrice,
        discountedCentavos: applied.discountedUnitCentavos,
        savedCentavos: applied.perUnitDiscountCentavos,
      };
    });
  const accords = productAccords(row.accords);
  const notePyramid = normaliseNotePyramid(row.notePyramid, null);
  const looseNotes = !notePyramid ? row.notes?.trim() || null : null;
  const isDecant = row.type === "DECANT";
  const concentration = concentrationLabel(row.concentration) ?? concentrationLabel(guessConcentration(row.skuLabel));
  const genderLabel = row.gender ? capitalizeFirst(row.gender) : null;
  const concentrationGender = [concentration, genderLabel].filter(Boolean).join(" · ") || null;
  const topSeasons = topSeasonLabels(row.seasonBreakout);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: labelForType(row.type), href: `/shop?type=${row.type}` },
          { label: row.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="flex flex-col gap-6 md:pr-12">
          <CompositionCanvas
            brand={row.brand}
            name={row.name}
            pyramid={notePyramid}
            showComposition
            imageUrl={image[0]?.url}
            imageAlt={image[0]?.alt}
            cornerLabel={labelForCategory(row.fragranceCategory)}
          />

          {/* Mobile only — same header as the desktop right column below, shown
              here so the title sits above "Main accords" on narrow screens
              instead of after it. */}
          <ProductTitleHeader
            brand={row.brand}
            name={row.name}
            concentrationGender={concentrationGender}
            productId={row.productId}
            className="flex md:hidden"
          />

          {accords && accords.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Main accords</p>
              <AccordStrip accords={accords} />
            </div>
          ) : null}

          {notePyramid ? (
            <CompositionContent pyramid={notePyramid} perfumers={row.perfumers ?? null} />
          ) : looseNotes ? (
            <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">{looseNotes}</p>
          ) : null}

          {row.longevity || topSeasons ? (
            <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
              {topSeasons ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Seasons</p>
                  <p className="text-sm text-foreground">{topSeasons}</p>
                </div>
              ) : null}
              {row.longevity ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Longevity</p>
                  <p className="text-sm text-foreground">{row.longevity}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 md:sticky md:top-20 md:self-stretch md:pl-12">
          <ProductTitleHeader
            brand={row.brand}
            name={row.name}
            concentrationGender={concentrationGender}
            productId={row.productId}
            className="hidden md:flex"
          />

          {isDecant ? (
            <DecantBuyBox options={decantOptions} initialSkuId={row.skuId} />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
                </Badge>
                <Badge variant="outline">{labelForCondition(row.condition)}</Badge>
                {soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
              </div>

              <SizeSection
                options={siblings.map((s) => ({
                  key: s.id,
                  href: `/shop/${s.id}`,
                  label: sizeOnlyLabel(s.label).toUpperCase() || s.label,
                  active: s.id === row.skuId,
                }))}
              />

              <BuyBox
                skuId={row.skuId}
                originalCentavos={row.retailPrice}
                discountedCentavos={discountedUnitCentavos}
                savedCentavos={perUnitDiscountCentavos}
                soldOut={soldOut}
              />
            </>
          )}

          <section className="border-t border-border/60 pt-2">
            <DisclosureAccordion
              items={[
                {
                  id: "shipping",
                  label: policyCopy.shipping.label,
                  content: <p>{policyCopy.shipping.body}</p>,
                },
                {
                  id: "returns",
                  label: policyCopy.returns.label,
                  content: <p>{policyCopy.returns.body}</p>,
                },
              ]}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function ProductTitleHeader({
  brand,
  name,
  concentrationGender,
  productId,
  className,
}: {
  brand: string;
  name: string;
  concentrationGender: string | null;
  productId: string;
  className?: string;
}) {
  return (
    <div className={cn("items-start justify-between gap-3", className)}>
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{brand}</p>
        <h1 className="font-serif-display text-4xl leading-[1.05] sm:text-5xl">{name}</h1>
        {concentrationGender ? <p className="text-sm text-muted-foreground">{concentrationGender}</p> : null}
      </div>
      <WishlistButton productId={productId} variant="icon" />
    </div>
  );
}

function SizeSection({
  options,
}: {
  options: Array<{ key: string; href: string | null; label: string; active: boolean }>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          if (!option.href) {
            return (
              <span
                key={option.key}
                className="inline-flex h-11 min-w-[3.5rem] cursor-not-allowed items-center justify-center border border-dashed border-border px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
              >
                {option.label}
              </span>
            );
          }
          return (
            <Link
              key={option.key}
              href={option.href}
              className={cn(
                "inline-flex h-11 min-w-[3.5rem] items-center justify-center border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
                option.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CompositionContent({
  pyramid,
  perfumers,
}: {
  pyramid: ReturnType<typeof normaliseNotePyramid>;
  perfumers: string[] | null;
}) {
  const top = pyramid?.top ?? [];
  const middle = pyramid?.middle ?? [];
  const base = pyramid?.base ?? [];
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Notes</p>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 border-b border-border/40 pb-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="text-center">Top</span>
          <span className="text-center">Heart</span>
          <span className="text-center">Base</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm leading-relaxed">
          <NoteColumn notes={top} />
          <NoteColumn notes={middle} />
          <NoteColumn notes={base} />
        </div>
      </div>
      {perfumers && perfumers.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <span className="uppercase tracking-[0.28em]">Perfumer</span>: {perfumers.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function NoteColumn({ notes }: { notes: string[] }) {
  if (notes.length === 0) {
    return <p className="text-center text-xs text-muted-foreground">—</p>;
  }
  return <p className="text-center text-sm text-foreground">{notes.join(", ")}</p>;
}

function topSeasonLabels(breakout: unknown, limit = 2): string | null {
  if (!breakout || typeof breakout !== "object") return null;
  const entries = Object.entries(breakout as Record<string, number>)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([season]) => capitalizeFirst(season));
  return entries.length > 0 ? entries.join(", ") : null;
}
