"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { expireMyUnpaidOrder, remindMyUnpaidOrder } from "@/actions/order-actions";
import { PAYMENT_REMINDER_RETRY_MS } from "@/domain/payment-reminder";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function PaymentWindowTimer({
  orderId,
  deadline,
  remindAt,
  now: serverNow,
  children,
}: {
  orderId: string;
  deadline: string;
  remindAt: string;
  /** The server's clock when the page rendered. The first paint uses it (so server and client text match) and the countdown ticks from its offset to the device clock, so a wrong phone clock can't end the window early. */
  now: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const deadlineMs = new Date(deadline).getTime();
  const remindMs = new Date(remindAt).getTime();
  const serverNowMs = new Date(serverNow).getTime();
  const [now, setNow] = useState(serverNowMs);
  const remaining = deadlineMs - now;

  useEffect(() => {
    let reminded = false;
    let expired = false;
    let reminding = false;
    let nextTryAt = 0;
    const offset = serverNowMs - Date.now();
    const current = () => Date.now() + offset;
    const maybeRemind = (tick: number) => {
      if (reminded || reminding || tick < remindMs || tick >= deadlineMs || tick < nextTryAt) return;
      reminding = true;
      void remindMyUnpaidOrder(orderId).then((result) => {
        reminding = false;
        if (result === "sent" || result === "skipped") {
          reminded = true;
          return;
        }
        nextTryAt = current() + PAYMENT_REMINDER_RETRY_MS;
      });
    };
    maybeRemind(current());
    const id = window.setInterval(() => {
      const tick = current();
      setNow(tick);
      maybeRemind(tick);
      if (!expired && tick >= deadlineMs) {
        expired = true;
        void expireMyUnpaidOrder(orderId).then(() => router.refresh());
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs, orderId, remindMs, router, serverNowMs]);

  if (remaining <= 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Time is up. This order is being cancelled and the hold is released.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" role="timer" aria-live="off">
        <span className="font-medium tabular-nums">{formatRemaining(remaining)}</span>
        <span className="text-muted-foreground"> left to upload your receipt. After that the order is cancelled and the hold is released.</span>
      </p>
      {children}
    </div>
  );
}
