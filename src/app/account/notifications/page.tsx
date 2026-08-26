import { eq } from "drizzle-orm";
import { requireActiveCustomer } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateNotificationPreferences } from "@/actions/account-actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireActiveCustomer();
  const row = (await db().select().from(users).where(eq(users.id, user.id)))[0];
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Notifications</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateNotificationPreferences} className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Order emails (receipts, confirmation, shipping) always send. This toggle is only for future promotions.
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="marketingOptIn" defaultChecked={row?.marketingOptIn} />
              Send me news and promotions
            </label>
            <SubmitButton>Save</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
