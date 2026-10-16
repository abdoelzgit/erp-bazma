"use client";

import {
  MagnifyingGlassIcon,
  PlusIcon,
  CaretRightIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  return (
    <aside className="w-full lg:w-80 border-r bg-muted/20 flex flex-col shrink-0">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Drafts</h2>
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
            New draft
          </Button>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search drafts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter kategori draft"
            className="bg-transparent border rounded px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none"
          >
            <option value="All">All drafts</option>
            <option value="Product updates">Product updates</option>
            <option value="Guides">Guides</option>
            <option value="Company news">Company news</option>
            <option value="Uncategorized">Uncategorized</option>
          </select>

          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>Last edited</span>
            <ArrowsDownUpIcon className="size-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {drafts.map((draft) => {
          const isSelected = draft.id === selectedDraftId;
          return (
            <div
              key={draft.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(draft.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(draft.id)}
              className={`p-3.5 transition-colors cursor-pointer relative group ${
                isSelected
                  ? "bg-accent/80 border-l-4 border-l-primary text-accent-foreground"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug line-clamp-1 text-foreground">
                  {draft.title || "Untitled draft"}
                </h3>
                {isSelected && (
                  <CaretRightIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {draft.description || "No context yet"}
              </p>

              <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
                <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
                  {draft.category}
                </span>
                <span>{draft.timeAgo}</span>
              </div>
            </div>
          );
        })}

        {drafts.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Tidak ada draft yang cocok.
          </div>
        )}
      </div>

      <div className="p-3 border-t text-center text-[11px] text-muted-foreground bg-muted/10">
        Showing all {drafts.length} drafts
      </div>
    </aside>
  );
}
