"use client";

import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CaretRightIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Draft } from "../ppd.types";

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
      <div className="shrink-0 space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Permohonan</h2>
            <Badge variant="secondary" className="rounded-md font-mono text-xs">
              {drafts.length}
            </Badge>
          </div>
          <Button
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
          <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            id="ppd-draft-search"
            type="text"
            placeholder="Cari permohonan..."
            aria-label="Cari permohonan"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter status permohonan"
            className="bg-background border rounded px-2 py-1 text-xs text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="All">Semua permohonan</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Diajukan</option>
          </select>

          <button
            type="button"
            onClick={() => setSortNewestFirst((newestFirst) => !newestFirst)}
            aria-label={`Urutkan berdasarkan waktu perubahan, ${sortNewestFirst ? "terbaru dahulu" : "terlama dahulu"}`}
            className="flex min-h-9 items-center gap-1 rounded px-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{sortNewestFirst ? "Terbaru" : "Terlama"}</span>
            <ArrowsDownUpIcon className="size-3" />
          </button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 overscroll-contain">
        <div className="divide-y divide-border/60">
          {sortedDrafts.map((draft) => {
          const isSelected = draft.id === selectedDraftId;
          return (
            <button
              type="button"
              key={draft.id}
              onClick={() => onSelect(draft.id)}
              aria-pressed={isSelected}
              className={`relative block w-full p-3.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group ${
                isSelected
                  ? "bg-accent/80 text-accent-foreground"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug line-clamp-1 text-foreground">
                  {draft.title || "Draft tanpa judul"}
                </h3>
                {isSelected && (
                  <CaretRightIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {draft.description || "Belum ada keterangan"}
              </p>

              <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
                <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
                  {draft.status === "Submitted" ? "Diajukan" : "Draft"}
                </span>
                <span>{draft.timeAgo}</span>
              </div>
            </button>
          );
          })}

        {sortedDrafts.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tidak ada draft yang cocok.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-muted/10 p-3 text-center text-[11px] text-muted-foreground">
        Menampilkan {drafts.length} permohonan
      </div>
    </aside>
  );
}
