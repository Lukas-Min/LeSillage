import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account/profile");
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Name: {session.user.name ?? "—"}</p>
          <p>Email: {session.user.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Edit profile coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
