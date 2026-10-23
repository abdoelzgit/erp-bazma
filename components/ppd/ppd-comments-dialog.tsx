"use client";

import { useState } from "react";
import { ChatCircleTextIcon, CircleNotchIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { addPpdCommentAction, getPpdCommentsAction } from "@/app/actions/ppd";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PpdCommentView } from "./ppd.types";

export function PpdCommentsDialog({ requestId, requestTitle }: { requestId: string; requestTitle: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PpdCommentView[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const openThread = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setError(null);
    setLoading(true);
    const result = await getPpdCommentsAction(requestId);
    setLoading(false);
    if ("error" in result) setError(result.error ?? "Komentar gagal dimuat.");
    else setComments(result.comments);
  };

  const sendComment = async () => {
    setSending(true);
    setError(null);
    const result = await addPpdCommentAction({ requestId, body });
    setSending(false);
    if ("error" in result || !result.comment) {
      setError("error" in result ? result.error ?? "Komentar gagal dikirim." : "Komentar gagal dikirim.");
      return;
    }
    setComments((current) => [...current, result.comment!]);
    setBody("");
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void openThread(true)}>
        <ChatCircleTextIcon className="size-4" /> Komentar
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => void openThread(nextOpen)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Diskusi PPD</DialogTitle>
            <DialogDescription>{requestTitle || "Permohonan PPD"}</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border p-3">
            {loading ? <p className="text-sm text-muted-foreground">Memuat komentar…</p> : comments.length ? comments.map((comment) => (
              <article key={comment.id} className="rounded-md bg-muted/40 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium">{comment.authorName}</p>
                  <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("id-ID")}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              </article>
            )) : <p className="text-sm text-muted-foreground">Belum ada komentar. Mulai diskusi untuk pengajuan ini.</p>}
          </div>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={3} placeholder="Tulis komentar…" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" disabled={sending || loading || !body.trim()} onClick={() => void sendComment()}>
              {sending ? <CircleNotchIcon className="mr-2 size-4 animate-spin" /> : <PaperPlaneRightIcon className="mr-2 size-4" />}
              Kirim komentar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
