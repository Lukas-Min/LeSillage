import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PromoCodeFormSkeleton } from "@/components/admin/promo-skeletons";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";

/** Same layout as the page: header, then the blank two-column form. */
export default function NewPromoCodeLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Promo codes"
        title="New promo code"
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/promo?tab=codes">Back</Link>
          </Button>
        }
      />
      <PromoCodeFormSkeleton mode="create" />
    </div>
  );
}
