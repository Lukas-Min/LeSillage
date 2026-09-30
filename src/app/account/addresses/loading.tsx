import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard, Eyebrow } from "@/components/ui/section";
import { AreaHeader, PageColumns } from "@/components/ui/page-layout";
import { cn } from "@/lib/utils";

// Spans, not <Skeleton> (a div): they sit inside SectionCard's <p>/<h2>.
const inlineSkeleton = "skeleton-shine inline-block rounded-md bg-muted align-middle";

const ADDRESS_FIELDS = [
  { label: "Province" },
  { label: "City / Municipality" },
  { label: "Barangay" },
  { label: "Postal code" },
  { label: "Street address", wide: true },
];

const SAVED_FIELDS = [
  { label: "Label", wide: true },
  { label: "Recipient" },
  { label: "Mobile (PH)" },
  ...ADDRESS_FIELDS,
];

const NEW_FIELDS = [{ label: "Recipient" }, { label: "Mobile (PH)" }, ...ADDRESS_FIELDS, { label: "Label" }];

function FieldSkeletons({ fields }: { fields: { label: string; wide?: boolean }[] }) {
  return (
    <>
      {fields.map((field) => (
        <div key={field.label} className={cn("space-y-1", field.wide && "sm:col-span-2")}>
          <Label>{field.label}</Label>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs sm:col-span-2">
        <Skeleton className="h-3.5 w-3.5 rounded-sm" />
        Set as default
      </div>
    </>
  );
}

export default function AddressLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Addresses"
        title="Where we ship to"
        subtitle="Save up to 5 addresses. Mark your default so checkout is one tap."
      />

      <PageColumns
        main={
          <>
            {/* One saved address. The Default badge and the Make default button
                depend on the row, so neither is drawn. */}
            <ul className="space-y-4">
              <li>
                <SectionCard
                  eyebrow={<span className={cn(inlineSkeleton, "h-2.5 w-16")} />}
                  title={<span className={cn(inlineSkeleton, "h-4 w-36")} />}
                  description={
                    <>
                      <span className={cn(inlineSkeleton, "h-3.5 w-full")} />
                      <span className={cn(inlineSkeleton, "h-3.5 w-1/2")} />
                    </>
                  }
                  contentClassName="space-y-3"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FieldSkeletons fields={SAVED_FIELDS} />
                    <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                      <Skeleton className="h-7 w-14" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  </div>
                </SectionCard>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              <Eyebrow className="inline">Privacy</Eyebrow>{" "}
              Addresses are encrypted in transit and used only for shipping and pickup.
            </p>
          </>
        }
        side={
          /* Static apart from the province list, but the fields stay skeletons
             so nothing typed before the page swaps in is lost. */
          <SectionCard
            eyebrow="Add"
            title="New address"
            description="We will prefill Metro Manila. Adjust to match your address."
            actions={<MapPin className="h-4 w-4 text-gold" />}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:[&>*]:col-span-1!">
              <FieldSkeletons fields={NEW_FIELDS} />
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <Button type="button" className="h-11 w-full sm:w-auto">
                  Save
                </Button>
              </div>
            </div>
          </SectionCard>
        }
      />
    </div>
  );
}
