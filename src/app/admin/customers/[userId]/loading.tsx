import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ACCOUNT_FIELDS = ["Email:", "Name:", "Phone:", "Role:", "Marketing opt-in:", "Joined:"];

export default function AdminCustomerLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-5 w-56 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Total spent</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {ACCOUNT_FIELDS.map((label) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-muted-foreground">{label}</span>
              <Skeleton className={label === "Role:" ? "h-5 w-20" : "h-4 w-32"} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promo codes</CardTitle>
          <CardAction>
            {/* The Add link needs the userId, which loading.tsx can't read — same look, not yet a link. */}
            <Button asChild className="h-11">
              <span>Add</span>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-1.5 pt-0.5 pb-1">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-3 w-20 max-w-full" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-5.5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
