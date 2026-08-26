import { notFound } from "next/navigation";
import { fragranceCategory, type FragranceCategory } from "@/db/schema";
import { ShopView } from "@/components/store/shop-view";

export const dynamic = "force-dynamic";

const VALID: FragranceCategory[] = ["NICHE", "DESIGNER", "MIDDLE_EASTERN"];
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
  const key = category.toLowerCase();
  const matched = (fragranceCategory as readonly string[]).find((v) => v.toLowerCase() === key);
  if (!matched || !VALID.includes(matched as FragranceCategory)) return notFound();
  return (
    <ShopView
      title={LABEL[matched as FragranceCategory]}
      subtitle={`Curated ${LABEL[matched as FragranceCategory].toLowerCase()} picks — full bottles, partials, and decants.`}
      filter={{ fragranceCategory: matched as FragranceCategory }}
    />
  );
}
