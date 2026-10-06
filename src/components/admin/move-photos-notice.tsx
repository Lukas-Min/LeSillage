"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveProductPhotosBatch } from "@/actions/admin-catalog-actions";

/**
 * The Products page notice for photos still loading from Fragrantica (or
 * older uploads): "Move photos" stores them in our own Blob store as
 * compressed WebP, a batch at a time (moveProductPhotosBatch), with progress
 * shown here. Photos that fail keep their old link and are listed.
 */
export function MovePhotosNotice({ count }: { count: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [moved, setMoved] = useState(0);
  const [remaining, setRemaining] = useState(count);
  const [failed, setFailed] = useState<Array<{ id: string; url: string; error: string }>>([]);
  const [bytes, setBytes] = useState({ before: 0, after: 0 });

  // A retry clears the failed list and tries those photos again.
  async function run(retryFailed = false) {
    setRunning(true);
    const skipIds = retryFailed ? [] : failed.map((photo) => photo.id);
    if (retryFailed) setFailed([]);
    let movedTotal = moved;
    let before = bytes.before;
    let after = bytes.after;
    try {
      for (;;) {
        const result = await moveProductPhotosBatch(skipIds);
        if (!result.ok) {
          toast.error(result.error);
          break;
        }
        movedTotal += result.moved;
        before += result.oldBytes;
        after += result.newBytes;
        skipIds.push(...result.failed.map((photo) => photo.id));
        setMoved(movedTotal);
        setBytes({ before, after });
        setRemaining(result.remaining);
        if (result.failed.length > 0) setFailed((current) => [...current, ...result.failed]);
        if (result.remaining === 0 || result.moved + result.failed.length === 0) break;
      }
      if (movedTotal > 0) {
        toast.success(`Moved ${movedTotal} photo${movedTotal === 1 ? "" : "s"}. The shop shows them within a minute.`);
      }
    } catch {
      toast.error("Moving photos failed. Please try again.");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  const kb = (value: number) => `${Math.round(value / 1024)}KB`;
  const progress = moved > 0 ? ` Moved ${moved} so far: ${kb(bytes.before)} → ${kb(bytes.after)}.` : "";
  return (
    <div role="status" className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {remaining > 0
            ? `${remaining} product photo${remaining === 1 ? " still loads" : "s still load"} from Fragrantica or an older upload. Moving ${remaining === 1 ? "it" : "them"} stores a compressed copy in our own storage (about half the size, same look).`
            : failed.length > 0
              ? `${failed.length} photo${failed.length === 1 ? " couldn't" : "s couldn't"} be moved and ${failed.length === 1 ? "keeps its" : "keep their"} old link, listed below.`
              : "Every product photo is in our own storage."}
          {progress}
        </p>
        {remaining > 0 || failed.length > 0 ? (
          <Button
            onClick={() => run(remaining === 0)}
            disabled={running}
            className="h-10 shrink-0 self-end sm:self-auto"
          >
            {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {running ? "Moving photos…" : remaining > 0 ? "Move photos" : "Try again"}
          </Button>
        ) : null}
      </div>
      {failed.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {failed.map((photo) => (
            <li key={photo.id} className="break-all">
              Kept the old link for {photo.url}: {photo.error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
