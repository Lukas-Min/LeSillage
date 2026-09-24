"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PromoCodeForm, type PromoCodeFormValues } from "@/components/admin/promo-code-form";
import { updatePromoCode } from "@/actions/admin-promo-code-actions";

/**
 * Editing a code opens its own dialog, scoped to that one code only — not an
 * inline accordion sitting in the list, which used to let a long edit form
 * push every other row around and left it unclear which code you were even
 * looking at once you'd scrolled past its header.
 */
export function PromoCodeEditDialog({ values }: { values: PromoCodeFormValues }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      {/* The form has 8+ fields — taller than fits in one screen on a
          phone, so (matching the same max-h/overflow split SearchOverlay
          already uses) the header stays put and only the field grid below
          it scrolls, rather than either overflowing the viewport with no
          way to reach Save or losing track of which code this is once
          you've scrolled past the title. */}
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit <span className="font-mono">{values.code}</span>
          </DialogTitle>
          <DialogDescription>Changes apply immediately once saved.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <PromoCodeForm
            action={updatePromoCode}
            mode="edit"
            values={values}
            onSaved={() => {
              setOpen(false);
              // Not "${values.code}" updated — the form's own Code field can
              // rename it, which would make this stale for the one save that
              // changes it.
              toast.success("Promo code updated");
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
