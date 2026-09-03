import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We will email a 6-digit code to verify your address.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
