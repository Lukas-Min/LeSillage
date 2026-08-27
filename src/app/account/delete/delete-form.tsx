"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteAccount,
  requestReauthCode,
} from "@/actions/account-actions";

export function DeleteAccountForm({ email }: { email: string }) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "code" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<Date | null>(null);

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
    setBusy("delete");
    setError(null);
    try {
      const fd = new FormData();
      fd.set("confirmEmail", confirmEmail.trim().toLowerCase());
      fd.set("code", code.trim());
      await deleteAccount(fd);
      setDoneAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setBusy(null);
    }
  }

  if (doneAt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        Account deleted. You will be signed out shortly.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="text-sm text-destructive">
        Type <span className="font-mono">{email}</span> to confirm. Then enter the 6-digit code we email you.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
        <p className="text-xs text-muted-foreground">
          We will email a confirmation code to your current email.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={sendCode} disabled={busy !== null}>
          {busy === "code" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "code" ? "Sending…" : "Email code"}
        </Button>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="del-email">Confirm email</Label>
          <Input
            id="del-email"
            type="email"
            placeholder={email}
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="del-code">6-digit code</Label>
          <Input
            id="del-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="destructive" disabled={busy !== null}>
          {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "delete" ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
    </div>
  );
}