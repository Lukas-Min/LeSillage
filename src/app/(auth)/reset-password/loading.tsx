import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-serif-display text-2xl">Choose a new password</h1>
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" inputMode="numeric" disabled className="h-11 tracking-[0.4em]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" disabled className="h-11" />
            </div>
            <Button type="button" disabled className="h-11 w-full rounded-md sm:ml-auto sm:block sm:w-fit" variant="gold">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
