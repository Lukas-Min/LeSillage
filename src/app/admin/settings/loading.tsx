import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Edit the dropdown values used across the storefront. Order-status transitions remain
        code-enforced because they drive inventory and email side effects.
      </p>
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
