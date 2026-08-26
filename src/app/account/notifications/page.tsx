import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account/notifications");
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Notifications</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Marketing opt-in and notification controls will live here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
