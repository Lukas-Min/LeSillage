"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Wraps a destructive form submission behind a confirmation dialog.
 * The form must be given the same `formId` via its own `id` prop, since
 * the confirm button submits it through the HTML `form` attribute from
 * outside the form's DOM subtree (the dialog renders in a portal).
 */
export function ConfirmSubmitButton({
  formId,
  title,
  description,
  confirmLabel = "Delete",
  triggerLabel,
  triggerVariant = "destructive",
  triggerSize,
  triggerClassName,
  triggerAriaLabel,
}: {
  formId: string;
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel: React.ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  /** Required for an icon-only triggerLabel (no visible text for a screen reader to read). */
  triggerAriaLabel?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={triggerVariant} size={triggerSize} className={triggerClassName} aria-label={triggerAriaLabel}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form={formId} variant="destructive">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
