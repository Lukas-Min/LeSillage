"use client";

import { useState } from "react";
import { subscribeToNewsletter } from "@/actions/newsletter-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * `compact` (the homepage): a slim band with no box, the heading on the left
 * and a one-line email + Subscribe form on the right from md up. Default
 * (/contact): the original centred, boxed card.
 */
export function SubscribeHero({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const data = new FormData();
      data.set("email", email);
      const result = await subscribeToNewsletter(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setMessage(
        result.needsConfirmation
          ? "Almost done. Check your inbox for a link to confirm."
          : "You're subscribed. News and promotions will come by email.",
      );
    } finally {
      setPending(false);
    }
  }

  const status = (
    <>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      ) : null}
    </>
  );
  const emailField = (
    <>
      <Label htmlFor="subscribe-email" className="sr-only">
        Email
      </Label>
      <Input
        id="subscribe-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={compact ? "min-w-0 flex-1" : undefined}
      />
    </>
  );

  if (compact) {
    return (
      <section className="flex flex-col gap-4 border-y border-border py-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="space-y-1">
          <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.32em] text-gold-ink">Subscribe</p>
          <h2 className="font-serif-display text-2xl leading-tight">News and promotions</h2>
          <p className="text-sm text-muted-foreground">New fragrances, restocks, and offers. At most once a week.</p>
        </div>
        <div className="w-full space-y-2 md:max-w-md">
          <form onSubmit={onSubmit} className="flex flex-col gap-2 min-[400px]:flex-row">
            {emailField}
            <Button type="submit" variant="gold" className="h-11 shrink-0 rounded-md px-6" disabled={pending}>
              {pending ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>
          {status}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gold/35 bg-gold/5 px-5 py-8 text-center sm:px-8">
      <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.32em] text-gold-ink">Subscribe</p>
      <h2 className="mt-2 font-serif-display text-2xl leading-tight sm:text-3xl">News and promotions</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        The same emails as Account notifications: new fragrances, restocks, and limited offers. No more than once a week.
      </p>
      <form onSubmit={onSubmit} className="mx-auto mt-5 flex w-full max-w-md flex-col gap-2">
        {emailField}
        <Button type="submit" variant="gold" className="h-11 w-full rounded-md" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
        {status}
      </form>
    </section>
  );
}
