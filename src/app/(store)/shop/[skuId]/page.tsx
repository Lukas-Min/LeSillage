import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productImages, productDiscounts, promoSettings } from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { AccordStrip } from "@/components/store/accord-strip";
import { WishlistButton } from "@/components/store/wishlist-button";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { labelForCondition } from "@/lib/catalog";
import { productAccords } from "@/lib/product-accords";
import { policyCopy } from "@/lib/policy-copy";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type NotePyramid = { top: string[]; middle: string[]; base: string[] } | null;

const FULL_BOTTLE_PRESENTATION = "FULL · 100ML";

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
        type: products.type,
        description: products.description,
        notes: products.notes,
        remainingMl: products.remainingMl,
        notePyramid: products.notePyramid,
        accords: products.accords,
        perfumers: products.perfumers,
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
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

  const [images, discounts, siblings, promoRow] = await Promise.all([
    client
      .select({ url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, row.productId)),
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, row.productId)),
    client
      .select({
        id: skus.id,
        label: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isActive: skus.isActive,
        isTester: skus.isTester,
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
  const image = images[0];
  const accords = productAccords(row.accords);
  const notePyramid = normaliseNotePyramid(row.notePyramid, row.notes);
  const familyLabel = (row.family ?? "").trim();
  const backHref = row.type === "DECANT" ? "/decants" : "/bottles";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to catalog
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-[1.05fr_1fr] sm:gap-12">
        <ProductImage
          src={image?.url ?? null}
          alt={image?.alt ?? row.name}
          fallback={row.brand}
          className="aspect-square w-full rounded-2xl border border-gold/30"
          sizes="(max-width: 640px) 100vw, 50vw"
        />

        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-gold-foreground">
              {row.brand}
            </p>
            <h1 className="font-serif-display text-4xl leading-[1.05] sm:text-5xl">
              {row.name}
            </h1>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
              </Badge>
              <Badge variant="outline">
                {row.condition === "BNIB" ? "Sealed" : labelForCondition(row.condition)}
              </Badge>
              {soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            </div>
          </div>

          <div className="rounded-xl border border-gold/30 bg-cream/60 p-4 shadow-[inset_0_1px_0_rgba(176,138,82,0.12)]">
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              {shelfEyebrow(row, familyLabel)}
            </p>
            {familyLabel ? (
              <p className="mt-2 font-serif-display italic text-base text-foreground/80">
                {describeFamily(row.type, familyLabel)}
              </p>
            ) : null}
          </div>

          <AccordStrip accords={accords} />

          {row.type === "DECANT" ? (
            <SizeSection
              label="Size"
              options={DECANT_SIZES_ML.map((size) => {
                const match = siblings.find((s) => s.sizeMl === size);
                return {
                  key: String(size),
                  href: match ? `/shop/${match.id}` : null,
                  label: `${size}ML`,
                  active: match?.id === row.skuId,
                };
              })}
              showFullBottle={false}
            />
          ) : (
            <SizeSection
              label="Size"
              showFullBottle
              fullBottleLabel={FULL_BOTTLE_PRESENTATION}
              fullBottleActive={row.skuLabel === FULL_BOTTLE_PRESENTATION}
              options={siblings.map((s) => ({
                key: s.id,
                href: `/shop/${s.id}`,
                label: s.label,
                active: s.id === row.skuId,
              }))}
            />
          )}

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
              <WishlistIconButton productId={row.productId} />
            </div>
          )}

          <section className="mt-6 border-t border-border/60 pt-6">
            <DisclosureAccordion
              items={[
                {
                  id: "composition",
                  label: "Composition",
                  defaultOpen: true,
                  content: (
                    <CompositionContent
                      pyramid={notePyramid}
                      perfumers={row.perfumers ?? null}
                    />
                  ),
                },
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

function SizeSection({
  label,
  options,
  showFullBottle,
  fullBottleLabel,
  fullBottleActive,
}: {
  label: string;
  options: Array<{ key: string; href: string | null; label: string; active: boolean }>;
  showFullBottle: boolean;
  fullBottleLabel?: string;
  fullBottleActive?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
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
        {showFullBottle && fullBottleLabel ? (
          <span
            className={cn(
              "inline-flex h-11 min-w-[3.5rem] items-center justify-center rounded-md border px-4 text-xs uppercase tracking-[0.2em]",
              fullBottleActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground/70",
            )}
          >
            {fullBottleLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WishlistIconButton({ productId }: { productId: string }) {
  return (
    <span className="contents">
      <WishlistButton productId={productId} variant="icon" />
    </span>
  );
}

function CompositionContent({
  pyramid,
  perfumers,
}: {
  pyramid: NotePyramid;
  perfumers: string[] | null;
}) {
  const top = pyramid?.top ?? [];
  const middle = pyramid?.middle ?? [];
  const base = pyramid?.base ?? [];
  return (
    <div className="space-y-4">
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

function normaliseNotePyramid(value: unknown, fallbackNotes: string | null): NotePyramid {
  if (value && typeof value === "object") {
    const top = pickNotes((value as { top?: unknown }).top);
    const middle = pickNotes((value as { middle?: unknown }).middle);
    const base = pickNotes((value as { base?: unknown }).base);
    return { top, middle, base };
  }
  if (fallbackNotes && fallbackNotes.trim().length > 0) {
    const parts = fallbackNotes
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    return { top: parts, middle: [], base: [] };
  }
  return null;
}

function pickNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function describeFamily(type: string, family: string): string {
  if (type === "DECANT") return `A softer pour of ${family.toLowerCase()}.`;
  return `${family}.`;
}

function shelfEyebrow(
  row: { family: string | null; fragranceCategory: string },
  familyLabel: string,
): string {
  const familyPart = familyLabel ? familyLabel.toUpperCase() : "NICHE SHELF";
  const category = labelForCategory(row.fragranceCategory);
  return `${familyPart} · ${category}`;
}

function labelForCategory(category: string): string {
  switch (category) {
    case "DESIGNER":
      return "DESIGNER SHELF";
    case "MIDDLE_EASTERN":
      return "MIDDLE EASTERN SHELF";
    default:
      return "NICHE SHELF";
  }
}
