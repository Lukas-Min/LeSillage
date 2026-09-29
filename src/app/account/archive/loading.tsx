import { PauseCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionCard } from "@/components/ui/section";

export default function ArchiveAccountLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Archive account"
        subtitle="A temporary, reversible way to step away — signs you out and gives you 30 days to change your mind."
      />
      <SectionCard
        className="border-destructive/30"
        eyebrow="What happens"
        title="Archiving your account"
        actions={<PauseCircle className="h-4 w-4 text-destructive" />}
      >
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          <li>You will be signed out immediately.</li>
          <li>Log back in any time within 30 days and your account picks up right where it left off — archiving is cancelled automatically.</li>
          <li>If 30 days pass with no login, your account is permanently deleted the same way &ldquo;Delete account&rdquo; works.</li>
        </ul>
      </SectionCard>
      {/* ArchiveAccountForm asks for the password, or for an emailed code
          when the account has none, so its contents wait for the user row.
          The shape is the password form, the common case. */}
      <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="space-y-3">
          <Skeleton className="my-0.5 h-4 w-48 max-w-full" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
    </div>
  );
}
