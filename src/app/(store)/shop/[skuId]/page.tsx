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
import { Eyebrow } from "@/components/ui/section";
import { labelForCondition } from "@/lib/catalog";
import { productAccords } from "@/lib/product-accords";
import { policyCopy } from "@/lib/policy-copy";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type NotePyramid = { top: string[]; middle: string[]; base: string[] } | null;

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

  const sizeOptions =
    row.type === "DECANT"
      ? DECANT_SIZES_ML.map((size) => {
          const match = siblings.find((s) => s.sizeMl === size);
          return { size, skuId: match?.id ?? null };
        })
      : siblings.map((s) => ({ size: s.sizeMl, skuId: s.id, label: s.label }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Link
        href={backHref}
        className="text-xs uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground"
      >
        ← Back to catalog
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <ProductImage
          src={image?.url ?? null}
          alt={image?.alt ?? row.name}
          fallback={row.brand}
          className="aspect-square w-full rounded-2xl"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <Eyebrow>{row.brand}</Eyebrow>
            <h1 className="font-serif-display text-3xl leading-tight sm:text-4xl">{row.name}</h1>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
              </Badge>
              <Badge variant="outline">{row.condition === "BNIB" ? "Sealed" : labelForCondition(row.condition)}</Badge>
              {soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            </div>
          </div>

          <AccordStrip accords={accords} />

          {familyLabel ? (
            <p className="font-serif-display italic text-sm text-muted-foreground">
              {describeFamily(row.type, familyLabel)}
            </p>
          ) : null}

          {row.type === "DECANT" ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((option) => {
                  if (!("size" in option) || option.size == null) return null;
                  const href = option.skuId ? `/shop/${option.skuId}` : null;
                  const active = option.skuId === row.skuId;
                  const className = cn(
                    "inline-flex min-h-11 min-w-16 items-center justify-center rounded-full border px-4 text-xs uppercase tracking-[0.2em]",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : href
                        ? "border-border hover:bg-muted"
                        : "cursor-not-allowed border-dashed text-muted-foreground",
                  );
                  if (!href) {
                    return (
                      <span key={option.size} className={className}>
                        {option.size}ml
                      </span>
                    );
                  }
                  return (
                    <Link key={option.size} href={href} className={className}>
                      {option.size}ml
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : siblings.length > 1 ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Options</p>
              <div className="flex flex-wrap gap-2">
                {siblings.map((option) => (
                  <Link
                    key={option.id}
                    href={`/shop/${option.id}`}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-xs uppercase tracking-[0.2em]",
                      option.id === row.skuId
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Size · {row.skuLabel}
            </p>
          )}

          <Price
            originalCentavos={row.retailPrice}
            discountedCentavos={discountedUnitCentavos}
            savedCentavos={perUnitDiscountCentavos}
          />

          {soldOut ? (
            <p className="text-sm text-destructive">Sold out — check back soon.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <AddToCartButton skuId={row.skuId} />
              <WishlistButton productId={row.productId} />
            </div>
          )}
        </div>
      </div>

      <section className="mt-12 border-t border-border/60 pt-8">
        <DisclosureAccordion
          items={[
            {
              id: "composition",
              label: "Composition",
              defaultOpen: true,
              content: <CompositionContent pyramid={notePyramid} perfumers={row.perfumers ?? null} notes={row.notes ?? null} />,
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
    </main>
  );
}

function CompositionContent({
  pyramid,
  perfumers,
  notes,
}: {
  pyramid: NotePyramid;
  perfumers: string[] | null;
  notes: string | null;
}) {
  const fallback = (notes ?? "").split(/[,;]/).map((part) => part.trim()).filter(Boolean);
  const top = pyramid?.top ?? (pyramid ? [] : fallback);
  const middle = pyramid?.middle ?? [];
  const base = pyramid?.base ?? [];
  const hasAny = top.length > 0 || middle.length > 0 || base.length > 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NoteColumn label="Top" notes={top} />
        <NoteColumn label="Heart" notes={middle} />
        <NoteColumn label="Base" notes={base} />
      </div>
      {!hasAny ? (
        <p className="text-xs text-muted-foreground">No note breakdown yet.</p>
      ) : null}
      {perfumers && perfumers.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <span className="uppercase tracking-[0.28em]">Perfumer</span>: {perfumers.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function NoteColumn({ label, notes }: { label: string; notes: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <p className="text-sm leading-relaxed text-foreground">{notes.join(" · ")}</p>
      )}
    </div>
  );
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
