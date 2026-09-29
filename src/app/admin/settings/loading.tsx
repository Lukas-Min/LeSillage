import { Label } from "@/components/ui/label";
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
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-3 rounded-xl border p-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <ul className="space-y-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <li key={row} className="flex items-end gap-2 border-t pt-2">
                  <div className="flex flex-1 items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label>Value</Label>
                      <Skeleton className="h-11 w-full" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label>Label</Label>
                      <Skeleton className="h-11 w-full" />
                    </div>
                    <Skeleton className="h-7 w-12" />
                  </div>
                  <Skeleton className="h-7 w-20" />
                </li>
              ))}
            </ul>
            <div className="flex items-end gap-2 border-t pt-3">
              <div className="flex-1 space-y-1">
                <Label>New value</Label>
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="flex-1 space-y-1">
                <Label>Label</Label>
                <Skeleton className="h-11 w-full" />
              </div>
              <Skeleton className="h-7 w-12" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
