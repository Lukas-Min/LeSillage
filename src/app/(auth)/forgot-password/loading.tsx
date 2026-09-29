import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If an account exists, we will email a 6-digit reset code.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled className="h-11" />
            </div>
            <Button type="button" disabled className="h-11 w-full rounded-md sm:ml-auto sm:block sm:w-fit" variant="gold">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
