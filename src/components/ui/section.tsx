import * as React from "react";
import { cn } from "@/lib/utils";

type EyebrowProps = React.ComponentProps<"p">;

export function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-[10px] uppercase tracking-[0.32em] text-gold",
        className,
      )}
      {...props}
    />
  );
}

type SurfaceProps = React.ComponentProps<"div"> & {
  as?: "div" | "section" | "article" | "aside";
};

export function Surface({ className, as: Comp = "section", ...props }: SurfaceProps) {
  return (
    <Comp
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-36px_rgba(31,28,24,0.18)]",
        className,
      )}
      {...props}
    />
  );
}

type PageHeaderProps = React.ComponentProps<"header"> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({
  className,
  eyebrow,
  title,
  subtitle,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-serif-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type SectionProps = React.ComponentProps<"div"> & {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  contentClassName?: string;
};

export function SectionCard({
  className,
  eyebrow,
  title,
  description,
  actions,
  contentClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-36px_rgba(31,28,24,0.18)] p-5 sm:p-6", className)}
      {...props}
    >
      {(eyebrow || title || description || actions) ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? (
              <h2 className="font-serif-display text-lg leading-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </div>
  );
}

export function SurfaceCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-36px_rgba(31,28,24,0.18)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type EmptyStateProps = React.ComponentProps<"div"> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({
  className,
  eyebrow,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <p className="font-serif-display text-xl">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

type StatTileProps = React.ComponentProps<"div"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
};

export function StatTile({ className, label, value, hint, ...props }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-36px_rgba(31,28,24,0.18)]",
        className,
      )}
      {...props}
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="font-serif-display text-2xl leading-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Divider({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("border-border/60", className)} {...props} />;
}