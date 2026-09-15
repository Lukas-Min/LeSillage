"use client";

import { useActionState, useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateAnnouncement } from "@/actions/admin-announcement-actions";
import { MAX_ANNOUNCEMENT_LENGTH, MAX_ANNOUNCEMENT_MESSAGES } from "@/domain/announcement";

/**
 * Edits the scrolling bar at the top of the storefront. One line per message,
 * which keeps it obvious how the bar is assembled without needing a repeater UI
 * — the bar joins them with a ◆ and loops forever.
 */
export function AnnouncementForm({ enabled, messages }: { enabled: boolean; messages: string[] }) {
  const [state, formAction] = useActionState(updateAnnouncement, { savedAt: 0, error: null });
  const uid = useId();
  const saved = state.savedAt > 0 && !state.error;

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
        Show the announcement bar
      </label>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-messages`}>Messages — one per line</Label>
        <Textarea
          id={`${uid}-messages`}
          name="messages"
          rows={5}
          defaultValue={messages.join("\n")}
          placeholder={"Enjoy 10% off with code WELCOME10\nFree delivery on ₱2,000 of decants"}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? `${uid}-error` : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Up to {MAX_ANNOUNCEMENT_MESSAGES} lines, {MAX_ANNOUNCEMENT_LENGTH} characters each. They scroll in the order
          written and loop continuously, so a line can follow on from the one above it. A promo code written in capitals
          (WELCOME10) is emphasised automatically. Keep them true to the codes and thresholds set on this page —
          customers read this before anything else.
        </p>
      </div>
      {state.error ? (
        <p id={`${uid}-error`} role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-xs text-muted-foreground">
          Saved — the bar updates on the storefront right away.
        </p>
      ) : null}
      <SubmitButton pendingLabel="Saving…">Save announcement</SubmitButton>
    </form>
  );
}
