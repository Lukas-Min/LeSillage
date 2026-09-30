import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PromoCodeFormSkeleton } from "@/components/admin/promo-skeletons";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";

const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

/** Same layout as the page: header, then the two-column form. */
export default function EditPromoCodeLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Promo code"
        title={
          <>
            Edit <span className={`${inlineSkeleton} h-7 w-36`} />
          </>
        }
        badge={<Skeleton className="h-5 w-14" />}
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/promo?tab=codes">Back</Link>
          </Button>
        }
      />
      <PromoCodeFormSkeleton mode="edit" />
    </div>
  );
}
