"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitPaymentReceipt } from "@/actions/order-actions";

export function ReceiptUploader({ orderId }: { orderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
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
              try {
                await submitPaymentReceipt(formData);
                toast.success("Receipt uploaded — we will email once verified.");
                formRef.current?.reset();
                setPreview(null);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Upload failed");
              }
            })
          }
          className="space-y-3"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input
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
            className="block w-full text-sm"
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
