import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountVerifyLoading() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code we sent you.</p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
