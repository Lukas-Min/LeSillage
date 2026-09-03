import { redirect } from "next/navigation";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { FragranticaReviewForm, type ReviewDefaults } from "./review-form";
import { guessConcentration } from "@/domain/concentration";
import { lookupPendingPayload } from "@/lib/fragella-pending-store";

interface PageProps {
  searchParams: Promise<{ query?: string }>;
}

export const dynamic = "force-dynamic";

function pendingToDefaults(pending: Awaited<ReturnType<typeof lookupPendingPayload>>): ReviewDefaults | null {
  if (!pending) return null;
  const parsed = pending.parsed;
  if (!parsed) return null;
  return {
    name: parsed.name ?? "",
    brand: parsed.brand ?? "",
    type: "DECANT",
    fragranceCategory: "NICHE",
    description: parsed.description ?? "",
    releaseYear: parsed.year?.toString() ?? "",
    gender: parsed.gender ?? "",
    concentration: guessConcentration(parsed.concentration) ?? "",
    longevity: parsed.longevity ?? "",
    sillage: parsed.sillage ?? "",
    priceValue: parsed.priceValue ?? "",
    ratingValue: parsed.ratingValue?.toString() ?? "",
    ratingCount: parsed.ratingCount?.toString() ?? "",
    reviewsCount: parsed.reviewsCount?.toString() ?? "",
    imageUrl: parsed.imageUrl ?? "",
    topNotes: parsed.notes?.top.join(", ") ?? "",
    middleNotes: parsed.notes?.middle.join(", ") ?? "",
    baseNotes: parsed.notes?.base.join(", ") ?? "",
    perfumers: parsed.perfumers?.join(", ") ?? "",
    accords:
      parsed.accords
        ?.map((accord) =>
          typeof accord.strength === "number" ? `${accord.name} ${accord.strength}` : accord.name,
        )
        .join("\n") ?? "",
  };
}

export default async function FragranticaReviewPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/admin/products/fragrantica");
  const { query } = await searchParams;
  if (!query) redirect("/admin/products/fragrantica");

  const initialDefaults: ReviewDefaults = {
    name: "",
    brand: "",
    type: "DECANT",
    fragranceCategory: "NICHE",
    description: "",
    releaseYear: "",
    gender: "",
    concentration: "",
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

  let source = "lookup";
  const pending = await lookupPendingPayload(session.user.id, query);
  const defaults = pendingToDefaults(pending);
  if (defaults) {
    Object.assign(initialDefaults, defaults);
    source = "paste";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Confirm details before saving"
        subtitle="Pre-filled from your paste. Adjust anything that looks off before saving."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products/fragrantica">Start over</Link>
          </Button>
        }
      />
      <SectionCard eyebrow="Source" title={source}>
        <Eyebrow>Query</Eyebrow>
        <p className="font-mono text-sm">{query}</p>
      </SectionCard>
      <FragranticaReviewForm defaults={initialDefaults} query={query} />
    </div>
  );
}
