import Link from "next/link";
import { PageHeader, SectionCard, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      <SectionCard eyebrow="Source">
        <Eyebrow>Query</Eyebrow>
        <Skeleton className="h-4 w-48" />
      </SectionCard>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
