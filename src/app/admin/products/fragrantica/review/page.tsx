import { redirect } from "next/navigation";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { FragranticaReviewForm, type ReviewDefaults } from "./review-form";

interface PageProps {
  searchParams: Promise<{ query?: string }>;
}

export const dynamic = "force-dynamic";

export default async function FragranticaReviewPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/admin/products/fragrantica");
  const { query } = await searchParams;
  if (!query) redirect("/admin/products/fragrantica");

  const initial: ReviewDefaults = {
    name: "",
    brand: "",
    type: "DECANT",
    fragranceCategory: "NICHE",
    description: "",
    releaseYear: "",
    gender: "",
    longevity: "",
    sillage: "",
    priceValue: "",
    ratingValue: "",
    ratingCount: "",
    reviewsCount: "",
    imageUrl: "",
    topNotes: "",
    middleNotes: "",
    baseNotes: "",
    perfumers: "",
    accords: "",
  };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Confirm details before saving"
        subtitle="Fragella (or your paste) filled what we could. Adjust anything that looks off."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products/fragrantica">Start over</Link>
          </Button>
        }
      />
      <SectionCard
        eyebrow="Lookup"
        title={query ?? ""}
        description="This is the term we will use for the auto-refresh job in 15 days."
      >
        <Eyebrow>Query</Eyebrow>
        <p className="font-mono text-sm">{query ?? ""}</p>
      </SectionCard>
      <FragranticaReviewForm defaults={initial} query={query ?? ""} />
    </div>
  );
}