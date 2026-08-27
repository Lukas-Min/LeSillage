import Link from "next/link";
import { ArrowRight, ClipboardPaste, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, Eyebrow, SurfaceCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupFragranticaFromUrl } from "@/actions/fragrantica-actions";
import { previewPasteFragranticaAction } from "@/actions/fragella-mirror-actions";
import {
  countFragellaMirror,
  listRecentFragellaMirrorEntries,
  searchFragellaMirror,
} from "@/lib/fragella-mirror";
import { FragellaMirrorPicker } from "./fragella-mirror-picker";

export const dynamic = "force-dynamic";

export default async function FragranticaImportPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim();
  const [result, mirrorTotal, recent] = await Promise.all([
    query.length > 0
      ? searchFragellaMirror(query, { limit: 10 })
      : Promise.resolve({ hits: [], filledFromFragella: 0 }),
    countFragellaMirror(),
    listRecentFragellaMirrorEntries(20),
  ]);
  const recentHits = recent.map((hit) => ({
    ...hit,
    lastFetchedAt: hit.lastFetchedAt.toISOString(),
  }));

  async function lookup(formData: FormData) {
    "use server";
    await lookupFragranticaFromUrl(formData);
  }
  async function pastePreview(formData: FormData) {
    "use server";
    await previewPasteFragranticaAction(formData);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Import from Fragrantica"
        subtitle="Pick from the local Fragella mirror — no extra API calls unless the mirror is empty. New fragrances are warmed once and reused."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products">Back to products</Link>
          </Button>
        }
      />
      <SectionCard
        eyebrow="Local mirror"
        title="Pick a fragrance from the cache"
        description="Searches the local mirror first. Cold lookups fall back to Fragella and store the result so future imports are free."
        actions={<Sparkles className="h-4 w-4 text-gold" />}
      >
        <FragellaMirrorPicker
          initialHits={
            result.hits.length > 0
              ? result.hits.map((hit) => ({ ...hit, lastFetchedAt: hit.lastFetchedAt.toISOString() }))
              : recentHits
          }
          initialQuery={query}
          initialFilledFromFragella={result.filledFromFragella}
          mirrorTotal={mirrorTotal}
        />
      </SectionCard>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          eyebrow="Live lookup"
          title="Fetch from Fragella now"
          description="One request per import. Pick this when the perfume is not yet in the mirror."
          actions={<ArrowRight className="h-4 w-4 text-gold" />}
        >
          <form action={lookup} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fragella-query">Fragrantica URL or perfume name</Label>
              <Input
                id="fragella-query"
                name="fragellaQuery"
                placeholder="https://www.fragrantica.com/perfume/Creed/Aventus-9828.html"
                required
              />
            </div>
            <Button type="submit">
              Look up
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </SectionCard>
        <SectionCard
          eyebrow="Manual paste"
          title="Paste Fragrantica HTML or JSON"
          description="Right-click the Fragrantica page → View Source → copy → paste here."
          actions={<ClipboardPaste className="h-4 w-4 text-gold" />}
        >
          <form action={pastePreview} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="paste">Page source or JSON blob</Label>
              <Textarea
                id="paste"
                name="paste"
                rows={8}
                placeholder="<html>... or { ... }"
                required
              />
            </div>
            <Button type="submit" variant="outline">
              Parse paste
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </SectionCard>
      </div>
      <SurfaceCard className="border-gold/40 bg-gold/5 p-4 text-sm">
        <Eyebrow>How the mirror works</Eyebrow>
        <p>
          Every Fragella call lands here. The daily cron refreshes rows older than 15 days, capped at 8 requests per run so the free 20/month tier lasts.
        </p>
      </SurfaceCard>
    </div>
  );
}