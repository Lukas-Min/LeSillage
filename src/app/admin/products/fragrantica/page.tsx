import Link from "next/link";
import { ArrowRight, ClipboardPaste, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, Eyebrow, SurfaceCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupFragranticaFromUrl, previewPasteFragrantica } from "@/actions/fragrantica-actions";

export default function FragranticaImportPage() {
  async function lookup(formData: FormData) {
    "use server";
    await lookupFragranticaFromUrl(formData);
  }
  async function pastePreview(formData: FormData) {
    "use server";
    await previewPasteFragrantica(formData);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Import from Fragrantica"
        subtitle="Paste a Fragrantica URL or perfume name and Fragella fills the form. Anything missing can be filled from a paste of the Fragrantica page."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products">Back to products</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          eyebrow="Option 1"
          title="Look up with Fragella"
          description="One free request per import. Fills brand, name, year, notes, accords, perfumers, ratings, longevity, sillage, season, and gender."
          actions={<Sparkles className="h-4 w-4 text-gold" />}
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
          eyebrow="Option 2"
          title="Paste Fragrantica HTML or JSON"
          description="Right-click the Fragrantica page → View Source → copy → paste here. JSON exports from Apify or ScrapingBee also work."
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
        <Eyebrow>Tip</Eyebrow>
        <p>
          Fragella's free tier gives 20 requests per month. We only refresh products older than 15 days, and never more than 8 per day.
        </p>
      </SurfaceCard>
    </div>
  );
}