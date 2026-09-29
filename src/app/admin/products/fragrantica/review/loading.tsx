import Link from "next/link";
import { Save } from "lucide-react";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function Field({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Skeleton className={tall ? "h-16 w-full" : "h-11 w-full"} />
    </div>
  );
}

export default function AdminFragranticaReviewLoading() {
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
      <SectionCard eyebrow="Source" title={<span className="skeleton-shine inline-block h-5 w-16 rounded-md bg-muted align-middle" />}>
        <Eyebrow>Query</Eyebrow>
        <Skeleton className="h-5 w-48" />
      </SectionCard>
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {["Name", "Brand", "Type", "Category", "Year", "Gender", "Concentration"].map((label) => (
                <Field key={label} label={label} />
              ))}
            </div>
            <Field label="Description" tall />
            <Field label="Image URL" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["Top notes", "Middle notes", "Base notes"].map((label) => (
                <Field key={label} label={label} tall />
              ))}
            </div>
            <Field label="Accords (one per line, optional strength 0–100)" tall />
            <Field label="Perfumers" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["Longevity", "Sillage", "Price/value"].map((label) => (
                <Field key={label} label={label} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["Rating value", "Rating count", "Reviews count"].map((label) => (
                <Field key={label} label={label} />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/products/fragrantica">Back to lookup</Link>
          </Button>
          <Button type="button" disabled>
            <Save className="h-4 w-4" />
            Save product
          </Button>
        </div>
      </div>
    </div>
  );
}
