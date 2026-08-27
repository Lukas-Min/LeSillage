"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  isValidPhilippineMobile,
  normalizePhoneInput,
} from "@/domain/phone";
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
  requestReauthCode,
  updateProfile,
} from "@/actions/account-actions";

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
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<null | "code" | "save">(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function sendCode() {
    setBusy("code");
    setError(null);
    try {
      await requestReauthCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("save");
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      setBusy(null);
      return;
    }
    try {
      const fd = new FormData();
      fd.set("code", code.trim());
      fd.set("currentPassword", current);
      fd.set("password", next);
      await changePassword(fd);
      setSavedAt(new Date());
      setCode("");
      setCurrent("");
      setNext("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          We will email a 6-digit confirmation code to your current email.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={sendCode} disabled={busy !== null}>
          {busy === "code" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "code" ? "Sending…" : "Email code"}
        </Button>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="cp-code">Confirmation code</Label>
          <Input
            id="cp-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-current">Current password</Label>
          <Input
            id="cp-current"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            placeholder="Required if you have one"
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
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters with a letter and a digit.
          </p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {savedAt && !error ? (
          <p className="flex items-center gap-1 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Password updated.
          </p>
        ) : null}
        <Button type="submit" disabled={busy !== null}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "save" ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

export function ChangeEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "requested">("idle");
  const [busy, setBusy] = useState<null | "request" | "confirm">(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("request");
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email.trim().toLowerCase());
      await requestEmailChange(fd);
      setStage("requested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("confirm");
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email.trim().toLowerCase());
      fd.set("code", code.trim());
      await confirmEmailChange(fd);
      setSavedAt(new Date());
      setStage("idle");
      setEmail("");
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
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
          />
        </div>
        <Button type="submit" variant="outline" disabled={busy !== null}>
          {busy === "request" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "request"
            ? "Sending…"
            : stage === "requested"
              ? "Resend code"
              : "Send code to new email"}
        </Button>
      </form>
      <form className="space-y-3 border-t border-border/60 pt-4" onSubmit={confirm}>
        <div className="space-y-1">
          <Label htmlFor="ce-code">Confirmation code</Label>
          <Input
            id="ce-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            We send the code to the new email. You will be signed out everywhere.
          </p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {savedAt && !error ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Email updated.
            </CardContent>
          </Card>
        ) : null}
        <Button type="submit" disabled={busy !== null}>
          {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "confirm" ? "Confirming…" : "Confirm email"}
        </Button>
      </form>
    </div>
  );
}