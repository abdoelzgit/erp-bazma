"use client";

import { XCircleIcon, FloppyDiskIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export type PpdActionBarProps = {
  status: string;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  isSaving?: boolean;
  cancelOnly?: boolean;
  saveDisabled?: boolean;
  submitDisabled?: boolean;
};

export function PpdActionBar({ status, onCancel, onSave, onSubmit, isSaving = false, cancelOnly = false, saveDisabled = false, submitDisabled = false }: PpdActionBarProps) {
  return (
    <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-background/95 backdrop-blur py-3">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isSaving}
        className="gap-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 w-full sm:w-auto"
      >
        <XCircleIcon className="size-4" />
        Batalkan
      </Button>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          {status}
        </span>

        {!cancelOnly && <>
          <Button variant="outline" onClick={onSave} disabled={isSaving || saveDisabled} className="gap-1.5 text-xs">
            <FloppyDiskIcon className="size-3.5" />
            Simpan draft
          </Button>

          <Button onClick={onSubmit} disabled={isSaving || submitDisabled} className="gap-1.5 text-xs font-semibold">
            <span>Submit</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </>}
      </div>
    </div>
  );
}
