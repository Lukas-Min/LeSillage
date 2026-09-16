"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitPaymentReceipt } from "@/actions/order-actions";
import { useCart } from "@/components/store/cart-context";

export function ReceiptUploader({
  orderId,
  redirectOnSuccessTo,
}: {
  orderId: string;
  /** When set, navigate here after a successful upload instead of staying
   *  put (e.g. checkout's payment page sends the customer to /shop once
   *  their order is fully placed and paid for). Omit to keep today's
   *  behavior — used by the /account/orders/[orderId] re-upload flow, which
   *  should stay on the order page. */
  redirectOnSuccessTo?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { refresh } = useCart();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <Card className="mt-6">
      <CardContent className="space-y-3 p-4">
        <h2 className="font-serif-display text-lg">Upload payment receipt</h2>
        <form
          ref={formRef}
          action={(formData) =>
            startTransition(async () => {
              const result = await submitPaymentReceipt(formData);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Receipt uploaded — we will email once verified.");
              formRef.current?.reset();
              setPreview(null);
              if (redirectOnSuccessTo) {
                await refresh();
                router.push(redirectOnSuccessTo);
              }
            })
          }
          className="space-y-3"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <Input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setPreview(URL.createObjectURL(file));
              } else {
                setPreview(null);
              }
            }}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Receipt preview" className="max-h-48 rounded border" />
          ) : null}
          <Input name="note" placeholder="Optional note for the team" maxLength={280} />
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Uploading…" : "Upload receipt"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
