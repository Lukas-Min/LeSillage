import { notFound } from "next/navigation";
import { type FragranceCategory } from "@/db/schema";
import { ShopView } from "@/components/store/shop-view";

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
      subtitle={`Curated ${LABEL[matched].toLowerCase()} picks — full bottles, partials, and decants.`}
      filter={{ fragranceCategory: matched }}
    />
  );
}
