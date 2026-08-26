import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, accounts } from "@/db/schema";
import { requireActiveCustomer } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
  requestReauthCode,
  updateProfile,
} from "@/actions/account-actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireActiveCustomer();
  const row = (await db().select().from(users).where(eq(users.id, sessionUser.id)))[0];
  const linked = await db().select().from(accounts).where(eq(accounts.userId, sessionUser.id));
  const phone = (row?.phone ?? "").replace(/^\+63/, "");
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={row?.name ?? ""} required className="h-11" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={row?.email ?? ""} disabled className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" name="phone" defaultValue={phone} required className="h-11" />
            </div>
            <SubmitButton>Save profile</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign-in methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {row?.passwordHash ? <p>Email and password</p> : <p>No password set</p>}
          {linked.length === 0 ? <p className="text-muted-foreground">No social logins linked.</p> : null}
          {linked.map((account) => (
            <p key={`${account.provider}:${account.providerAccountId}`}>{account.provider}</p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={requestReauthCode}>
            <SubmitButton variant="outline">Email a confirmation code</SubmitButton>
          </form>
          <form action={changePassword} className="space-y-3">
            <Input name="code" placeholder="6-digit code" className="h-11" required />
            <Input name="currentPassword" type="password" placeholder="Current password" className="h-11" />
            <Input name="password" type="password" placeholder="New password" className="h-11" required />
            <SubmitButton>Update password</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={requestEmailChange} className="space-y-3">
            <Input name="email" type="email" placeholder="New email" className="h-11" required />
            <SubmitButton variant="outline">Send code to new email</SubmitButton>
          </form>
          <form action={confirmEmailChange} className="space-y-3">
            <Input name="email" type="email" placeholder="New email again" className="h-11" required />
            <Input name="code" placeholder="6-digit code" className="h-11" required />
            <SubmitButton>Confirm email</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
