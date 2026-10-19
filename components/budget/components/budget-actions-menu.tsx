"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDownIcon, DownloadSimpleIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type BudgetActionsMenuProps = {
  onExport: () => void;
  onImport: () => void;
  onCreate: () => void;
  createDisabled: boolean;
  canManage: boolean;
};

export function BudgetActionsMenu({
  onExport,
  onImport,
  onCreate,
  createDisabled,
  canManage,
}: BudgetActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="budget-actions-menu"
        onClick={() => setOpen((value) => !value)}
        className="h-8 gap-1.5 text-xs"
      >
        Aksi budget
        <CaretDownIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div
          id="budget-actions-menu"
          role="group"
          aria-label="Aksi budget per account"
          className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md"
        >
          <Button variant="ghost" size="sm" onClick={() => runAction(onExport)} className="h-8 w-full justify-start gap-2 text-xs">
            <DownloadSimpleIcon className="size-3.5" />
            Export tabel
          </Button>
          {canManage && <Button variant="ghost" size="sm" onClick={() => runAction(onImport)} className="h-8 w-full justify-start gap-2 text-xs">
            <UploadSimpleIcon className="size-3.5" />
            Import tabel
          </Button>}
          {canManage && <Button
            variant="ghost"
            size="sm"
            onClick={() => runAction(onCreate)}
            disabled={createDisabled}
            title={createDisabled ? "Semua account sudah punya budget bulan ini" : undefined}
            className="h-8 w-full justify-start gap-2 text-xs"
          >
            <PlusIcon className="size-3.5" />
            Tambah budget
          </Button>}
        </div>
      )}
    </div>
  );
}
