"use client";

import { useState } from "react";
import { FacebookIcon, InstagramIcon } from "@/components/store/brand-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AskAboutOrderButton({
  messengerUrl,
  instagramUrl,
}: {
  messengerUrl: string;
  instagramUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full rounded-md sm:w-auto">
          Ask about this order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask about this order</DialogTitle>
          <DialogDescription>
            The order details are filled in. You can add more before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button asChild variant="outline" className="h-11 w-full rounded-md">
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <FacebookIcon />
              Facebook
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-md">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <InstagramIcon />
              Instagram
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
