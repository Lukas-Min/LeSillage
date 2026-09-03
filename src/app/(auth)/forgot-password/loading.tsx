import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPasswordLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If an account exists, we will email a 6-digit reset code.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
