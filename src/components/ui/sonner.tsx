"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Header is a sticky h-14 (56px) bar at z-30 — without an offset,
      // sonner's default top position sits underneath/inside it, reading as
      // an ugly full-width strip merged into the nav instead of a floating
      // card. Push toasts below it with a visible gap.
      offset={{ top: "72px" }}
      mobileOffset={{ top: "72px" }}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Le Sillage's own palette, not sonner's built-in richColors preset —
          // same destructive/gold tint conventions as Badge/Button elsewhere,
          // not a solid alert-red/green block.
          success: "!bg-gold/15 !text-gold-foreground !border-gold/30",
          error: "!bg-destructive/10 !text-destructive !border-destructive/20 dark:!bg-destructive/20",
          warning: "!bg-gold/15 !text-gold-foreground !border-gold/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
