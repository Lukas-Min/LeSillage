import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmailLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Check your email</h1>
      {/* The address comes from the ?email= search param, which loading.tsx can't
          read; a span rather than the div-based Skeleton so it nests in the <p>. */}
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to{" "}
        <span className="skeleton-shine inline-block h-4 w-40 rounded-md bg-muted align-middle" />.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" inputMode="numeric" disabled className="h-11 tracking-[0.4em]" />
            </div>
            <Button type="button" disabled className="h-11 w-full rounded-md sm:ml-auto sm:block sm:w-fit" variant="gold">
              Continue
            </Button>
          </div>
          <div>
            <Button type="button" disabled variant="ghost" className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
              Resend code
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
