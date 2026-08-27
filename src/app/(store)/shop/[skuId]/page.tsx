import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, promoSettings } from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { concentrationLabel, guessConcentration, sizeOnlyLabel } from "@/domain/concentration";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { AccordStrip } from "@/components/store/accord-strip";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { WishlistButton } from "@/components/store/wishlist-button";
import { labelForCondition } from "@/lib/catalog";
import { productAccords } from "@/lib/product-accords";
import { policyCopy } from "@/lib/policy-copy";
import { normaliseNotePyramid } from "@/lib/note-pyramid";
import { cn } from "@/lib/utils";

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
        type: products.type,
        description: products.description,
        notes: products.notes,
        remainingMl: products.remainingMl,
        notePyramid: products.notePyramid,
        accords: products.accords,
        perfumers: products.perfumers,
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

  const [discounts, siblings, promoRow] = await Promise.all([
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, row.productId)),
    client
      .select({
        id: skus.id,
        label: skus.label,
        sizeMl: skus.sizeMl,
      })
      .from(skus)
      .where(and(eq(skus.productId, row.productId), eq(skus.isActive, true), eq(skus.isTester, false))),
    client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
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
  const accords = productAccords(row.accords);
  const notePyramid = normaliseNotePyramid(row.notePyramid, row.notes);
  const familyLabel = (row.family ?? "").trim();
  const isDecant = row.type === "DECANT";
  const concentration = concentrationLabel(row.concentration) ?? concentrationLabel(guessConcentration(row.skuLabel));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: row.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="flex flex-col gap-6 md:pr-12">
          <CompositionCanvas brand={row.brand} name={row.name} pyramid={notePyramid} showComposition />

          <div className="rounded-md border border-border p-4">
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              {shelfEyebrow(row.fragranceCategory, familyLabel)}
            </p>
            {familyLabel || row.description ? (
              <p className="mt-2 font-serif-display italic text-base text-foreground/80">
                {row.description?.trim() || describeFamily(row.type, familyLabel)}
              </p>
            ) : null}
          </div>

          <AccordStrip accords={accords} />

          <CompositionContent pyramid={notePyramid} perfumers={row.perfumers ?? null} />

          <section className="space-y-4 border-t border-border/60 pt-4">
            <PolicySection label={policyCopy.shipping.label} body={policyCopy.shipping.body} />
            <PolicySection label={policyCopy.returns.label} body={policyCopy.returns.body} />
          </section>
        </div>

        <div className="flex flex-col gap-6 md:pl-12">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{row.brand}</p>
            <h1 className="font-serif-display text-4xl leading-[1.05] sm:text-5xl">{row.name}</h1>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">
                {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
              </Badge>
              <Badge variant="outline">{labelForCondition(row.condition)}</Badge>
              {soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            </div>
          </div>

          {concentration ? (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Concentration</p>
              <p className="font-serif-display text-lg">{concentration}</p>
            </div>
          ) : null}

          <SizeSection
            options={
              isDecant
                ? DECANT_SIZES_ML.map((size) => {
                    const match = siblings.find((s) => s.sizeMl === size);
                    return {
                      key: String(size),
                      href: match ? `/shop/${match.id}` : null,
                      label: `${size}ML`,
                      active: match?.id === row.skuId,
                    };
                  })
                : siblings.map((s) => ({
                    key: s.id,
                    href: `/shop/${s.id}`,
                    label: sizeOnlyLabel(s.label).toUpperCase() || s.label,
                    active: s.id === row.skuId,
                  }))
            }
          />

          <Price
            originalCentavos={row.retailPrice}
            discountedCentavos={discountedUnitCentavos}
            savedCentavos={perUnitDiscountCentavos}
          />

          {soldOut ? (
            <p className="text-sm text-destructive">Sold out — check back soon.</p>
          ) : (
            <div className="flex items-stretch gap-2">
              <AddToCartButton skuId={row.skuId} />
              <WishlistButton productId={row.productId} variant="icon" />
            </div>
          )}
        </div>
      </div>
    </main>
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
                className="inline-flex h-11 min-w-[3.5rem] cursor-not-allowed items-center justify-center rounded-md border border-dashed border-border px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
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
                "inline-flex h-11 min-w-[3.5rem] items-center justify-center rounded-md border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
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

function PolicySection({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-foreground">{label}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
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
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-foreground">Composition</p>
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

function describeFamily(type: string, family: string): string {
  if (!family) return "";
  if (type === "DECANT") return `A softer pour of ${family.toLowerCase()}.`;
  return `${family}.`;
}

function shelfEyebrow(category: string, familyLabel: string): string {
  const familyPart = familyLabel ? familyLabel.toUpperCase() : "FRAGRANCE";
  switch (category) {
    case "DESIGNER":
      return `${familyPart} · DESIGNER SHELF`;
    case "MIDDLE_EASTERN":
      return `${familyPart} · MIDDLE EASTERN SHELF`;
    case "NICHE":
      return `${familyPart} · NICHE SHELF`;
    default: {
      const exhaustive: never = category as never;
      return `${familyPart} · ${String(exhaustive)}`;
    }
  }
}
