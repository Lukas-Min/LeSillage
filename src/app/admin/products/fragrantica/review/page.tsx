import { redirect } from "next/navigation";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { FragranticaReviewForm, type ReviewDefaults } from "./review-form";
import { getFragellaMirrorEntry } from "@/lib/fragella-mirror";
import {
  lookupFragella,
  type FragellaRecord,
} from "@/lib/fragella";
import { lookupPendingPayload } from "@/lib/fragella-pending-store";

interface PageProps {
  searchParams: Promise<{ query?: string; mirror?: string }>;
}

export const dynamic = "force-dynamic";

function recordToDefaults(record: FragellaRecord): ReviewDefaults {
  return {
    name: record.name,
    brand: record.brand,
    type: "DECANT",
    fragranceCategory: "NICHE",
    description: record.description ?? "",
    releaseYear: record.year?.toString() ?? "",
    gender: record.gender ?? "",
    longevity: record.longevity ?? "",
    sillage: record.sillage ?? "",
    priceValue: record.priceValue ?? "",
    ratingValue: record.ratingValue?.toString() ?? "",
    ratingCount: record.ratingCount?.toString() ?? "",
    reviewsCount: record.reviewsCount?.toString() ?? "",
    imageUrl: record.imageUrl ?? "",
    topNotes: "",
    middleNotes: "",
    baseNotes: "",
    perfumers: record.perfumers?.join(", ") ?? "",
    accords:
      record.accords
        ?.map((accord) =>
          typeof accord.strength === "number" ? `${accord.name} ${accord.strength}` : accord.name,
        )
        .join("\n") ?? "",
  };
}

function pendingToDefaults(pending: Awaited<ReturnType<typeof lookupPendingPayload>>): ReviewDefaults | null {
  if (!pending) return null;
  const record = pending.fragella;
  const parsed = pending.parsed;
  if (!record && !parsed) return null;
  return {
    name: parsed?.name ?? record?.name ?? "",
    brand: parsed?.brand ?? record?.brand ?? "",
    type: "DECANT",
    fragranceCategory: "NICHE",
    description: parsed?.description ?? record?.description ?? "",
    releaseYear: parsed?.year?.toString() ?? record?.year?.toString() ?? "",
    gender: parsed?.gender ?? record?.gender ?? "",
    longevity: parsed?.longevity ?? record?.longevity ?? "",
    sillage: parsed?.sillage ?? record?.sillage ?? "",
    priceValue: parsed?.priceValue ?? record?.priceValue ?? "",
    ratingValue: parsed?.ratingValue?.toString() ?? record?.ratingValue?.toString() ?? "",
    ratingCount: parsed?.ratingCount?.toString() ?? record?.ratingCount?.toString() ?? "",
    reviewsCount: parsed?.reviewsCount?.toString() ?? record?.reviewsCount?.toString() ?? "",
    imageUrl: parsed?.imageUrl ?? record?.imageUrl ?? "",
    topNotes: parsed?.notes?.top.join(", ") ?? "",
    middleNotes: parsed?.notes?.middle.join(", ") ?? "",
    baseNotes: parsed?.notes?.base.join(", ") ?? "",
    perfumers: parsed?.perfumers?.join(", ") ?? record?.perfumers?.join(", ") ?? "",
    accords:
      parsed?.accords
        ?.map((accord) =>
          typeof accord.strength === "number" ? `${accord.name} ${accord.strength}` : accord.name,
        )
        .join("\n") ??
      record?.accords
        ?.map((accord) =>
          typeof accord.strength === "number" ? `${accord.name} ${accord.strength}` : accord.name,
        )
        .join("\n") ??
      "",
  };
}

export default async function FragranticaReviewPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/admin/products/fragrantica");
  const { query, mirror } = await searchParams;
  if (!query && !mirror) redirect("/admin/products/fragrantica");

  const initialDefaults: ReviewDefaults = {
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

  let source = "lookup";
  let filledFromFragella = false;
  if (mirror) {
    const entry = await getFragellaMirrorEntry(mirror);
    if (entry) {
      source = `mirror:${entry.id}`;
      const live = await lookupFragella(entry.id).catch(() => null);
      const record = live ?? {
        id: entry.id,
        name: entry.name,
        brand: entry.brand,
        year: entry.year,
        gender: entry.gender,
        imageUrl: entry.imageUrl,
        raw: entry.payload as Record<string, unknown>,
        perfumers: [],
        accords: [],
        notes: undefined,
      };
      Object.assign(initialDefaults, recordToDefaults(record));
      filledFromFragella = Boolean(live);
    } else {
      redirect(`/admin/products/fragrantica?q=${encodeURIComponent(query ?? "")}`);
    }
  } else {
    const pending = query ? await lookupPendingPayload(session.user.id, query) : null;
    const defaults = pendingToDefaults(pending);
    if (defaults) {
      Object.assign(initialDefaults, defaults);
      source = "paste";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Confirm details before saving"
        subtitle="Pre-filled from Fragella or your paste. Adjust anything that looks off before saving."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products/fragrantica">Start over</Link>
          </Button>
        }
      />
      <SectionCard
        eyebrow="Source"
        title={source}
        description={filledFromFragella
          ? "Fresh data pulled from Fragella on demand — this counts as 1 of your monthly requests."
          : "Served from the local Fragella mirror (no quota used)."}
      >
        <Eyebrow>Query</Eyebrow>
        <p className="font-mono text-sm">{query ?? mirror}</p>
      </SectionCard>
      <FragranticaReviewForm defaults={initialDefaults} query={query ?? mirror ?? ""} mirrorId={mirror} />
    </div>
  );
}