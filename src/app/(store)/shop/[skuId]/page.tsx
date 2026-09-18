import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, productDiscounts, productImages, promoSettings } from "@/db/schema";
import { withSiteWideDiscount } from "@/domain/discount";
import { DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { concentrationLabel, guessConcentration } from "@/domain/concentration";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { BuyBox } from "@/components/store/buy-box";
import { AccordStrip } from "@/components/store/accord-strip";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { WishlistButton } from "@/components/store/wishlist-button";
import { DecantBuyBox } from "@/components/store/decant-buy-box";
import { findSelectedVariant, type SizePickerOption } from "@/domain/variant-options";
import { labelForCategory, labelForType } from "@/domain/product-type";
import { buildVariantOptions } from "@/lib/catalog";
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
        provenance: skus.provenance,
        skuId: skus.id,
        skuLabel: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isActive: skus.isActive,
        productActive: products.isActive,
      })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(eq(skus.id, skuId))
  )[0];
  if (!row || !row.isActive || !row.productActive) return notFound();

  const [discounts, siblings, promoRow, image] = await Promise.all([
    client.select().from(productDiscounts).where(eq(productDiscounts.productId, row.productId)),
    client
      .select({
        skuId: skus.id,
        label: skus.label,
        sizeMl: skus.sizeMl,
        retailPrice: skus.retailPrice,
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        isTester: skus.isTester,
        availableForPreOrder: skus.availableForPreOrder,
      })
      .from(skus)
      .where(and(eq(skus.productId, row.productId), eq(skus.isActive, true))),
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
  const discountsWithSiteWide = withSiteWideDiscount(discounts, row.productId, {
    enabled: promoRow[0]?.siteWideDiscountEnabled ?? false,
    type: promoRow[0]?.siteWideDiscountType ?? "PERCENTAGE",
    amount: promoRow[0]?.siteWideDiscountAmount ?? 0,
  });
  const isDecant = row.type === "DECANT";
  const variantOptions = buildVariantOptions(siblings, discountsWithSiteWide, {
    isDecant,
    remainingMl,
    thresholdMl: threshold,
    isFullBottle: row.type === "FULL_BOTTLE",
  });
  // The current URL's SKU, resolved through the same size+provenance
  // grouping the picker uses — so the fulfillment badge, sold-out state, and
  // BuyBox's price all agree with whichever button/sub-option is showing as
  // selected, instead of being computed separately.
  // A FULL_BOTTLE SKU that's out of stock and not taking pre-orders is
  // excluded from variantOptions entirely (see buildVariantOptions) — a
  // stale link/bookmark to it 404s exactly like a deactivated SKU already
  // does above, rather than crashing on a missing variant.
  const currentVariant = findSelectedVariant(variantOptions, row.skuId);
  if (!currentVariant) return notFound();
  const fulfillment = currentVariant.fulfillment;
  const soldOut = Boolean(currentVariant.soldOut);
  const accords = productAccords(row.accords);
  const notePyramid = normaliseNotePyramid(row.notePyramid, null);
  const looseNotes = !notePyramid ? row.notes?.trim() || null : null;
  const concentration = concentrationLabel(row.concentration) ?? concentrationLabel(guessConcentration(row.skuLabel));
  const genderLabel = row.gender ? capitalizeFirst(row.gender) : null;
  const concentrationGender = [concentration, genderLabel].filter(Boolean).join(" · ") || null;
  const topSeasons = topSeasonLabels(row.seasonBreakout);

  return (
    <main className="w-full px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: labelForType(row.type), href: `/shop?type=${row.type}` },
          { label: row.name },
        ]}
      />

      {/* Both column wrappers below use `contents` on mobile — they render no
          box of their own, so their children flow directly into this
          outer flex column and can be reordered per-child with `order-*`.
          That lets the title row (which must stay a single WishlistButton
          instance — mounting it twice crashed production, see
          wishlist-button.tsx) sit right under the image on mobile while
          still opening the sticky right column on desktop, without ever
          rendering a second copy of it. */}
      <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="contents md:flex md:flex-col md:gap-6 md:pr-12">
          <CompositionCanvas
            brand={row.brand}
            name={row.name}
            pyramid={notePyramid}
            showComposition
            imageUrl={image[0]?.url}
            imageAlt={image[0]?.alt}
            cornerLabel={labelForCategory(row.fragranceCategory)}
            // No max-h/max-w cap here any more — the page-wide 2xl:80vw
            // container (root layout) now keeps this column, and so the
            // aspect-square photo inside it, from ever stretching wide
            // enough on a large monitor to push the buy box below the fold.
            className="order-1"
            enableLightbox
          />

          {accords && accords.length > 0 ? (
            <div className="order-3 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Main accords</p>
              <AccordStrip accords={accords} />
            </div>
          ) : null}

          {notePyramid ? (
            <div className="order-4">
              <CompositionContent pyramid={notePyramid} />
            </div>
          ) : looseNotes ? (
            <p className="order-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">{looseNotes}</p>
          ) : null}

          {row.longevity || topSeasons ? (
            <div className="order-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
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

        <div className="contents md:flex md:flex-col md:gap-6 md:sticky md:top-20 md:self-stretch md:pl-12">
          <div className="order-2 flex items-start justify-between gap-3">
            <ProductTitleText brand={row.brand} name={row.name} concentrationGender={concentrationGender} />
            <WishlistButton productId={row.productId} variant="icon" />
          </div>

          {isDecant ? (
            <div className="order-6 flex flex-col gap-6">
              <DecantBuyBox options={variantOptions} initialSkuId={row.skuId} />
            </div>
          ) : (
            <div className="order-6 flex flex-col gap-6">
              {/* Condition and provenance used to be separate badges here —
                  now folded into the size options below instead (always
                  "{size}ML · {provenance}", plus a secondary
                  condition/packaging picker when a size has more than one
                  SKU to distinguish). */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="h-auto px-3 py-1.5 text-sm">
                  {fulfillment === "PRE_ORDER" ? "Pre-order · 3 to 30 days" : "On hand · 1 to 2 days"}
                </Badge>
                {soldOut ? (
                  <Badge variant="destructive" className="h-auto px-3 py-1.5 text-sm">
                    Sold out
                  </Badge>
                ) : null}
              </div>

              <VariantSection options={variantOptions} currentSkuId={row.skuId} />

              <BuyBox
                skuId={currentVariant.skuId}
                originalCentavos={currentVariant.originalCentavos}
                discountedCentavos={currentVariant.discountedCentavos}
                savedCentavos={currentVariant.savedCentavos}
                discounts={currentVariant.discounts}
                soldOut={soldOut}
              />
            </div>
          )}

          <section className="order-7 border-t border-border/60 pt-2">
            <DisclosureAccordion
              items={[
                {
                  id: "shipping",
                  label: policyCopy.shipping.label,
                  content: <p>{policyCopy.shipping.body}</p>,
                  defaultOpen: true,
                },
                {
                  id: "returns",
                  label: policyCopy.returns.label,
                  content: <p>{policyCopy.returns.body}</p>,
                  defaultOpen: true,
                },
              ]}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

/** Pure text, no interactive state — safe to render more than once (see the
 *  mobile/desktop split above). WishlistButton is NOT part of this: it's a
 *  stateful client component and must stay single-instance. */
function ProductTitleText({
  brand,
  name,
  concentrationGender,
  className,
}: {
  brand: string;
  name: string;
  concentrationGender: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{brand}</p>
      <h1 className="font-serif-display text-4xl leading-[1.05] sm:text-5xl">{name}</h1>
      {concentrationGender ? <p className="text-sm text-muted-foreground">{concentrationGender}</p> : null}
    </div>
  );
}

/**
 * Full-bottle/partial equivalent of DecantBuyBox's client-side size picker —
 * navigates to a different SKU's own page per choice instead of swapping
 * state client-side, since each SKU here already has its own PDP. Two
 * tiers, same grouping `buildVariantOptions` already did: a Condition row
 * (BNIB/FP/BO — see ConditionPackagingChoice) shown first, then Size below
 * it. Condition is always shown, even with only one real choice to offer —
 * same "always populated" convention Size itself follows — so a plain BNIB
 * full bottle shows one BNIB button, not nothing.
 */
function VariantSection({
  options,
  currentSkuId,
}: {
  options: SizePickerOption[];
  currentSkuId: string;
}) {
  const activeGroup = options.find(
    (o) => o.skuId === currentSkuId || o.subOptions?.some((s) => s.skuId === currentSkuId),
  );
  const conditionOptions = activeGroup?.subOptions?.length ? activeGroup.subOptions : null;
  return (
    <div className="space-y-4">
      {conditionOptions ? (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Condition</p>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((sub) => (
              <Link
                key={sub.skuId}
                href={`/shop/${sub.skuId}`}
                className={cn(
                  "inline-flex h-11 min-w-[3.5rem] items-center justify-center border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
                  sub.skuId === currentSkuId
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Link
              key={option.skuId}
              href={`/shop/${option.skuId}`}
              className={cn(
                "inline-flex h-11 min-w-[3.5rem] items-center justify-center border px-4 text-xs uppercase tracking-[0.2em] transition-colors",
                option === activeGroup
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Some products carry up to 11 notes in a single tier, and note names as
 * long as "Indonesian Patchouli Leaf" — a fixed 3-column grid can't safely
 * hold that on a phone at any width; a lopsided tier (11 notes vs. 2) also
 * reads as three columns of wildly different heights. Below `sm` this
 * stacks Top/Heart/Base as three full-width, individually labeled sections
 * instead of forcing them side by side; `sm:` and up keeps the original
 * 3-column layout. `break-words` is kept on every note regardless of
 * breakpoint as a second line of defence against a single long name.
 */
function CompositionContent({
  pyramid,
}: {
  pyramid: ReturnType<typeof normaliseNotePyramid>;
}) {
  const top = pyramid?.top ?? [];
  const middle = pyramid?.middle ?? [];
  const base = pyramid?.base ?? [];
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Notes</p>
      <div className="space-y-3">
        <div className="hidden border-b border-border/40 pb-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:grid sm:grid-cols-3 sm:gap-2">
          <span className="text-center">Top</span>
          <span className="text-center">Heart</span>
          <span className="text-center">Base</span>
        </div>
        <div className="grid grid-cols-1 gap-4 text-sm leading-relaxed sm:grid-cols-3 sm:gap-2 sm:gap-y-0">
          <NoteColumn label="Top" notes={top} />
          <NoteColumn label="Heart" notes={middle} />
          <NoteColumn label="Base" notes={base} />
        </div>
      </div>
    </div>
  );
}

function NoteColumn({ label, notes }: { label: string; notes: string[] }) {
  return (
    <div className="space-y-2 sm:space-y-1">
      {/* Only the mobile, stacked layout needs its own label — sm: and up
          shares the header row above instead. */}
      <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:hidden">{label}</p>
      {notes.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:flex-col sm:flex-nowrap sm:gap-1">
          {notes.map((note, index) => (
            <span key={`${note}-${index}`} className="break-words text-foreground">
              {note}
            </span>
          ))}
        </div>
      )}
    </div>
  );
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
