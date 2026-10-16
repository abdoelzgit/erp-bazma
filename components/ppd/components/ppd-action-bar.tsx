"use client";

import { TrashIcon, FloppyDiskIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export type PpdActionBarProps = {
  status: string;
  onDelete: () => void;
  onSave: () => void;
  onSubmit: () => void;
};

export function PpdActionBar({ status, onDelete, onSave, onSubmit }: PpdActionBarProps) {
  return (
    <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-background/95 backdrop-blur py-3">
      <Button
        variant="outline"
        onClick={onDelete}
        className="gap-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 w-full sm:w-auto"
      >
        <TrashIcon className="size-4" />
        Delete draft
      </Button>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          {status}
        </span>

        <Button variant="outline" onClick={onSave} className="gap-1.5 text-xs">
          <FloppyDiskIcon className="size-3.5" />
          Save draft
        </Button>

        <Button onClick={onSubmit} className="gap-1.5 text-xs font-semibold">
          <span>Submit Draft</span>
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
