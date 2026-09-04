import { notFound } from "next/navigation";
import { type FragranceCategory } from "@/db/schema";
import { ShopView } from "@/components/store/shop-view";
import { FRAGRANCE_CATEGORY_BLURBS } from "@/lib/faq-copy";

export const dynamic = "force-dynamic";

const SLUGS: Record<string, FragranceCategory> = {
  niche: "NICHE",
  designer: "DESIGNER",
  "middle-eastern": "MIDDLE_EASTERN",
  middle_eastern: "MIDDLE_EASTERN",
};

const LABEL: Record<FragranceCategory, string> = {
  NICHE: "Niche",
  DESIGNER: "Designer",
  MIDDLE_EASTERN: "Middle Eastern",
};

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const matched = SLUGS[category.toLowerCase()];
  if (!matched) return notFound();
  return (
    <ShopView
      title={LABEL[matched]}
      // The blurbs are stored lower-case-initial so the FAQ can read
      // "Niche — small independent…"; here they stand alone as a sentence.
      // Only the first character is raised — `capitalizeFirst` would lower
      // the rest and flatten Gulf/Lattafa/Dior/YSL.
      subtitle={
        FRAGRANCE_CATEGORY_BLURBS[matched].charAt(0).toUpperCase() +
        FRAGRANCE_CATEGORY_BLURBS[matched].slice(1)
      }
      filter={{ fragranceCategory: matched }}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: LABEL[matched] }]}
    />
  );
}
