"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isValidPhilippineMobile,
  normalizePhoneInput,
} from "@/domain/phone";
import { startEmailChange, startPasswordChange, updateProfile } from "@/actions/account-actions";
import { linkOAuthAccount } from "@/actions/auth-actions";
import { oauthProviderLabel, type OAuthProvider } from "@/lib/oauth-providers";

type ProfileFormProps = {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
};

export function ProfileForm({ initialName, initialEmail, initialPhone }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    if (!isValidPhilippineMobile(phone)) {
      setError("Mobile must be 10 digits starting with 9.");
      setBusy(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("phone", normalizePhoneInput(phone));
      await updateProfile(fd);
      setSavedAt(new Date());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input value={initialEmail} disabled />
        <p className="text-xs text-muted-foreground">
          To change your email, use the section below — a confirmation code is required.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-phone">Mobile (PH)</Label>
        <Input
          id="profile-phone"
          name="phone"
          inputMode="numeric"
          placeholder="9171234567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          10 digits, starts with 9. The country code +63 is added automatically.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {savedAt && !error ? (
        <p className="flex items-center gap-1 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Saved.
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    if (next !== confirm) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.set("currentPassword", current);
      fd.set("password", next);
      fd.set("confirmPassword", confirm);
      const result = await startPasswordChange(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/account/verify?purpose=password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="cp-current">Current password</Label>
        <Input
          id="cp-current"
          type="password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          autoComplete="current-password"
          required={hasPassword}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-next">New password</Label>
        <Input
          id="cp-next"
          type="password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">At least 6 characters, with a letter and a number.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-confirm">Confirm password</Label>
        <Input
          id="cp-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Sending…" : "Continue"}
      </Button>
    </form>
  );
}

export function ChangeEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const nextEmail = email.trim().toLowerCase();
    try {
      const fd = new FormData();
      fd.set("email", nextEmail);
      const result = await startEmailChange(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/account/verify?purpose=email&email=${encodeURIComponent(nextEmail)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={requestCode}>
      <div className="space-y-1">
        <Label htmlFor="ce-email">New email</Label>
        <Input
          id="ce-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="h-11"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="h-11 w-full sm:ml-auto sm:block sm:w-fit">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Sending…" : "Continue"}
      </Button>
    </form>
  );
}

export function ConnectProviderButton({ provider }: { provider: OAuthProvider }) {
  return (
    <Button type="button" variant="outline" className="h-11 w-28" onClick={() => linkOAuthAccount(provider)}>
      Connect
    </Button>
  );
}