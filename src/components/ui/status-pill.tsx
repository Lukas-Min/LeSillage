import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPill = cva(
  "pill gap-1 rounded-none border tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-sky-300/60 bg-sky-50 text-sky-800",
        success: "border-emerald-300/60 bg-emerald-50 text-emerald-800",
        warn: "border-amber-300/60 bg-amber-50 text-amber-800",
        danger: "border-destructive/40 bg-destructive/10 text-destructive",
        gold: "border-gold/40 bg-gold/10 text-gold",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusPillProps = React.ComponentProps<"span"> & VariantProps<typeof statusPill>;

export function StatusPill({ className, tone, ...props }: StatusPillProps) {
  return <span className={cn(statusPill({ tone }), className)} {...props} />;
}

const orderTones: Record<string, StatusPillProps["tone"]> = {
  AWAITING_PAYMENT: "warn",
  RECEIPT_SUBMITTED: "info",
  CONFIRMED: "info",
  SHIPPED: "gold",
  DELIVERED: "success",
  READY_FOR_PICKUP: "gold",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function formatOrderStatus(status: string): string {
  const label = status.replace(/_/g, " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function OrderStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <StatusPill tone={orderTones[status] ?? "neutral"} className={className}>
      {formatOrderStatus(status)}
    </StatusPill>
  );
}