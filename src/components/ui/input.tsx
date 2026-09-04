"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function FileInput({ className, disabled, onChange, ...props }: React.ComponentProps<"input">) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState("");

  React.useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const reset = () => setFileName("");
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, []);

  return (
    <div className={cn("flex h-11 w-full min-w-0 items-center gap-3", className)}>
      <div className="relative inline-flex rounded-lg has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <Button type="button" tabIndex={-1} disabled={disabled} className="pointer-events-none">
          Choose File
        </Button>
        <input
          {...props}
          ref={ref}
          type="file"
          disabled={disabled}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? "");
            onChange?.(event);
          }}
        />
      </div>
      <span
        className={cn(
          "min-w-0 truncate text-sm",
          fileName ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {fileName || "No file chosen"}
      </span>
    </div>
  );
}

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type === "file") {
    return <FileInput className={className} {...props} />;
  }
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
