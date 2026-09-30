import { SectionCard } from "@/components/ui/section";
import { AreaHeader } from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";

// Spans, not <Skeleton> (a div): they sit inside SectionCard's <p>/<h2>.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

// Mirrors PromoCodeList on its default Valid tab. The tabs are static; only
// the codes come from the database.
export default function AccountPromoCodesLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AreaHeader
        eyebrow="Orders"
        title="Promo codes"
        subtitle="Codes for everyone, and any code made just for you. Tap one to copy it."
      />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex w-full items-center sm:w-auto sm:gap-x-6">
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center text-xs uppercase tracking-[0.22em] whitespace-nowrap transition-colors sm:flex-none font-medium text-foreground"
          >
            <span className="relative pb-2">
              Valid
              <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-foreground" />
            </span>
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center text-xs uppercase tracking-[0.22em] whitespace-nowrap transition-colors sm:flex-none text-muted-foreground hover:text-foreground"
          >
            <span className="relative pb-2">Used</span>
          </button>
        </div>
        <ul className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <SectionCard
                eyebrow={<span className={cn(inlineSkeleton, "h-2.5 w-16")} />}
                title={<span className={cn(inlineSkeleton, "h-4 w-28")} />}
                description={
                  <>
                    <span className={cn(inlineSkeleton, "h-3.5 w-full")} />
                    <span className={cn(inlineSkeleton, "h-3.5 w-2/3")} />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
