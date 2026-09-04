import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPill = cva(
  "inline-flex items-center gap-1 rounded-none border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
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
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function OrderStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <StatusPill tone={orderTones[status] ?? "neutral"} className={className}>
      {status.replace(/_/g, " ").toLowerCase()}
    </StatusPill>
  );
}