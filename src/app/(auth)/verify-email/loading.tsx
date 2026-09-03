import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function VerifyEmailLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code we sent to your inbox.</p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
