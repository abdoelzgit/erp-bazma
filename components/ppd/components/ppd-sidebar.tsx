"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ArrowsDownUpIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ppdStatusLabel } from "@/lib/ppd-labels";
import type { Draft } from "../ppd.types";

const CATEGORY_OPTIONS = [
  { value: "All", label: "Semua" },
  { value: "DRAFT", label: "Draft" },
  { value: "RETURNED_FOR_REVISION", label: "Perlu revisi" },
  { value: "IN_PROGRESS", label: "Dalam proses" },
  { value: "COMPLETED", label: "Selesai" },
];

export type PpdSidebarProps = {
  drafts: Draft[];
  selectedDraftId: string;
  onSelect: (id: string) => void;
  onCompose: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
};

export function PpdSidebar({
  drafts,
  selectedDraftId,
  onSelect,
  onCompose,
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: PpdSidebarProps) {
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const sortedDrafts = useMemo(
    () =>
      [...drafts].sort((a, b) => {
        const difference = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        return sortNewestFirst ? difference : -difference;
      }),
    [drafts, sortNewestFirst],
  );

  return (
    <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-80">
      <div className="shrink-0 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Permohonan</h2>
            <Badge variant="secondary" className="rounded-md font-mono text-xs">
              {drafts.length}
            </Badge>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCompose}
            className="h-8 gap-1 text-xs font-medium"
          >
            <PlusIcon className="size-3.5" />
            Buat baru
          </Button>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="ppd-draft-search"
            type="search"
            placeholder="Cari permohonan..."
            aria-label="Cari permohonan"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 bg-background pl-8 text-xs"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Select
            value={category}
            onValueChange={(value) => value && onCategoryChange(value)}
            items={CATEGORY_OPTIONS}
          >
            <SelectTrigger
              aria-label="Filter status permohonan"
              className="h-8 w-auto min-w-40 bg-background text-xs"
            >
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSortNewestFirst((newestFirst) => !newestFirst)}
            aria-label={`Urutkan berdasarkan waktu perubahan, ${sortNewestFirst ? "terbaru dahulu" : "terlama dahulu"}`}
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {sortNewestFirst ? "Terbaru" : "Terlama"}
            <ArrowsDownUpIcon className="size-3" />
          </Button>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1 overscroll-contain">
        <div>
          {sortedDrafts.map((draft, index) => {
            const isSelected = draft.id === selectedDraftId;
            const isDraft = draft.status === "DRAFT";
            return (
              <Fragment key={draft.id}>
                {index > 0 && <Separator className="bg-border/60" />}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSelect(draft.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-none p-3.5 text-left font-normal",
                    isSelected
                      ? "bg-accent/80 text-accent-foreground hover:bg-accent/80"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-semibold leading-snug text-foreground">
                      {draft.title || "Draft tanpa judul"}
                    </span>
                    {isSelected && (
                      <CaretRightIcon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {draft.description || "Belum ada keterangan"}
                  </span>

                  <span className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <Badge
                      variant={isDraft ? "secondary" : draft.status === "RETURNED_FOR_REVISION" ? "destructive" : "default"}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    >
                      {ppdStatusLabel(draft.status)}
                    </Badge>
                    <span>{draft.timeAgo}</span>
                  </span>
                </Button>
              </Fragment>
            );
          })}

          {sortedDrafts.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tidak ada draft yang cocok.
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="shrink-0 bg-muted/10 p-3 text-center text-[11px] text-muted-foreground">
        Menampilkan {drafts.length} permohonan
      </div>
    </aside>
  );
}
