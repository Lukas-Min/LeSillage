import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Mirrors EmailCodePanel. Only the address the code went to depends on the
// request; the code field stays a skeleton so nothing typed early is lost.
export default function AccountVerifyLoading() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to{" "}
        <span className="skeleton-shine inline-block h-3.5 w-40 rounded-md bg-muted align-middle" />.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <Button type="button" className="h-11 w-full rounded-md sm:ml-auto sm:block sm:w-fit" variant="gold">
              Continue
            </Button>
          </div>
          <div>
            <Button type="button" variant="ghost" className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
              Resend code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
