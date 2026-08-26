import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account");
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Welcome back</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Signed in as {session.user.email}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm" variant="outline"><Link href="/account/profile">Profile</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/orders">Orders</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/addresses">Addresses</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/wishlist">Wishlist</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/notifications">Notifications</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account/delete">Delete account</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
