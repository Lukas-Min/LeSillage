"use client";

import { useState } from "react";
import { subscribeToNewsletter } from "@/actions/newsletter-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SubscribeHero() {
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

  return (
    <section className="rounded-2xl border border-gold/35 bg-gold/5 px-5 py-8 text-center sm:px-8">
      <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Subscribe</p>
      <h2 className="mt-2 font-serif-display text-2xl leading-tight sm:text-3xl">News and promotions</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        The same emails as Account notifications: new fragrances, restocks, and limited offers. No more than once a week.
      </p>
      <form onSubmit={onSubmit} className="mx-auto mt-5 flex w-full max-w-md flex-col gap-2">
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
        />
        <Button type="submit" variant="gold" className="h-11 w-full rounded-md" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
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
      </form>
    </section>
  );
}
