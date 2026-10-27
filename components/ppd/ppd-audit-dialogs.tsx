"use client";

import { useState } from "react";
import { ArrowsLeftRightIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PpdApprovalEventView } from "./ppd.types";
import type { PpdRevisionChange } from "@/lib/ppd-revision";
import { ppdActionLabel, ppdStageLabel } from "@/lib/ppd-labels";

export function PpdHistoryDialog({ events }: { events: PpdApprovalEventView[] }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={() => setOpen(true)}>
        <ClockCounterClockwiseIcon className="size-4" aria-hidden="true" />
        Riwayat <span className="text-muted-foreground">{events.length}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(80vh,48rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Riwayat permohonan</DialogTitle>
            <DialogDescription>Urutan pengajuan dan keputusan reviewer untuk PPD ini.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-0">
            {[...events].reverse().map((event, index) => (
              <li key={event.id} className="relative grid grid-cols-[1rem_1fr] gap-3 pb-5 last:pb-0">
                {index < events.length - 1 && <span className="absolute left-[0.4375rem] top-3 h-full w-px bg-border" aria-hidden="true" />}
                <span className="relative mt-1 size-2.5 rounded-full border-2 border-primary bg-background" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium">{ppdActionLabel(event.action)} <span className="font-normal text-muted-foreground">· {ppdStageLabel(event.stage)}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.actorName} · {new Date(event.createdAt).toLocaleString("id-ID")}</p>
                  {event.note && <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{event.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PpdChangesDialog({ changes }: { changes: PpdRevisionChange[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={() => setOpen(true)}>
        <ArrowsLeftRightIcon className="size-4" aria-hidden="true" />
        {changes.length ? "Lihat perubahan" : "Belum ada perubahan"} <span className="text-muted-foreground">{changes.length}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(80vh,48rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perubahan sejak revisi diminta</DialogTitle>
            <DialogDescription>Perbandingan isi PPD saat revisi diminta dengan isian saat ini.</DialogDescription>
          </DialogHeader>
          {changes.length ? (
            <ul className="divide-y rounded-md border">
              {changes.map((change, index) => (
                <li key={`${change.label}-${index}`} className="space-y-2 p-4 text-sm">
                  <p className="font-medium">{change.label}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Sebelum</p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{change.before}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Sesudah</p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{change.after}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada perubahan terdeteksi pada revisi ini.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
