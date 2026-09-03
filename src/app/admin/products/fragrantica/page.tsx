import Link from "next/link";
import { ArrowRight, ClipboardPaste } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { previewPasteFragrantica } from "@/actions/fragrantica-actions";

export const dynamic = "force-dynamic";

export default function FragranticaImportPage() {
  async function pastePreview(formData: FormData) {
    "use server";
    await previewPasteFragrantica(formData);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Import from Fragrantica"
        subtitle="Paste a Fragrantica page's HTML or JSON to pre-fill a new product."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products">Back to products</Link>
          </Button>
        }
      />
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
  );
}
