import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OPTION_GRID } from "@/components/admin/option-list-shared";
import { cn } from "@/lib/utils";

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
            <div className="space-y-3">
              <div className={cn(OPTION_GRID, "text-xs text-muted-foreground")}>
                <span>Value</span>
                <span>Label</span>
                <span className="text-center">Active</span>
              </div>
              <ul className="space-y-2">
                {Array.from({ length: 3 }).map((_, row) => (
                  <li key={row} className={OPTION_GRID}>
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                    <div className="flex size-11 items-center justify-center">
                      <Skeleton className="size-4 rounded-sm" />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" disabled className="h-11 w-full sm:w-auto">
                  <Plus className="size-4" aria-hidden="true" />
                  Add value
                </Button>
                <Button type="button" disabled className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
                  Save
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
