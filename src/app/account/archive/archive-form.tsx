"use client";

import { useState } from "react";
import { Loader2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveAccount, requestReauthCode } from "@/actions/account-actions";

export function ArchiveAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "code" | "archive">(null);
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
    setBusy("archive");
    setError(null);
    const fd = new FormData();
    if (hasPassword) fd.set("password", password);
    else fd.set("code", code.trim());
    // A successful archive signs the customer out via signOut()'s redirect,
    // which can resolve here as undefined rather than a literal
    // { ok: true } — only an explicit ok: false means it actually failed.
    const result = await archiveAccount(fd);
    if (result && !result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setDoneAt(new Date());
    setBusy(null);
  }

  if (doneAt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <PauseCircle className="h-4 w-4" />
        Account archived. You will be signed out shortly.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      {hasPassword ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <p className="text-sm text-destructive">Enter your password to confirm.</p>
          <div className="space-y-1">
            <Label htmlFor="archive-password">Password</Label>
            <Input
              id="archive-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="destructive" disabled={busy !== null}>
            {busy === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy === "archive" ? "Archiving…" : "Archive my account"}
          </Button>
        </form>
      ) : (
        <>
          <p className="text-sm text-destructive">
            Your account doesn&apos;t have a password set. Enter the 6-digit code we email you to confirm.
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
              <Label htmlFor="archive-code">6-digit code</Label>
              <Input
                id="archive-code"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" variant="destructive" disabled={busy !== null}>
              {busy === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy === "archive" ? "Archiving…" : "Archive my account"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
