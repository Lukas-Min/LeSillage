import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

export default async function DeleteAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account/delete");
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Delete account</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Are you sure?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email le.sillage.mnl@gmail.com to request account deletion. We will confirm by email before processing.</p>
        </CardContent>
      </Card>
    </div>
  );
}
