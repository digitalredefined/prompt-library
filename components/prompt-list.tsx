"use client";

import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { FavoriteButton } from "@/components/favorite-button";
import { highlight } from "@/components/highlight";
import { CategoryChip, TagChip } from "@/components/labels";
import { PROMPT_DND_TYPE, useLibraryDnd } from "@/components/library-dnd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Minimal, serializable prompt shape the list needs (built on the server). */
export type PromptCard = {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  shared: boolean;
  favorite: boolean;
  updatedLabel: string;
  categories: { id: string; name: string; color: string | null }[];
  tags: { id: string; name: string }[];
};

export type FolderOption = { id: string; name: string };

/**
 * Library prompt grid with drag-and-drop + "Move to…" support (DIG-23).
 *
 * Each card is a drag source (native dataTransfer carries the prompt id) that
 * sidebar folders accept as drop targets. The "Move to…" menu is the accessible,
 * pointer-optional path to the same move. Cards optimistically removed from the
 * current view (via the shared DnD context) are hidden immediately.
 */
export function PromptList({
  prompts,
  folders,
  query,
}: {
  prompts: PromptCard[];
  folders: FolderOption[];
  /** Active search query (DIG-27); matches are highlighted in title + snippet. */
  query?: string;
}) {
  const { movedOut, setDragging } = useLibraryDnd();
  const visible = prompts.filter((p) => !movedOut.has(p.id));

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visible.map((prompt) => (
        <li
          key={prompt.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(PROMPT_DND_TYPE, prompt.id);
            e.dataTransfer.setData("text/plain", prompt.id);
            e.dataTransfer.effectAllowed = "move";
            setDragging(true);
          }}
          onDragEnd={() => setDragging(false)}
          className="border-foreground/10 hover:border-foreground/25 flex cursor-grab flex-col gap-2 rounded-lg border p-4 transition-colors active:cursor-grabbing"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/library/${prompt.id}`}
              draggable={false}
              className="font-medium hover:underline"
            >
              {highlight(prompt.title, query)}
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              {prompt.shared ? (
                <span className="text-foreground/50 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                  Shared
                </span>
              ) : null}
              <FavoriteButton
                promptId={prompt.id}
                favorite={prompt.favorite}
                className="-my-1"
              />
            </div>
          </div>
          <p className="text-foreground/50 line-clamp-2 flex-1 text-sm">
            {highlight(prompt.body, query)}
          </p>
          {prompt.categories.length > 0 || prompt.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {prompt.categories.map((c) => (
                <CategoryChip key={c.id} name={c.name} color={c.color} />
              ))}
              {prompt.tags.map((t) => (
                <TagChip key={t.id} name={t.name} />
              ))}
            </div>
          ) : null}
          <span className="text-foreground/40 text-xs">
            Updated {prompt.updatedLabel}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/library/${prompt.id}`} draggable={false}>
                Open
              </Link>
            </Button>
            <CopyButton text={prompt.body} promptId={prompt.id} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/library/${prompt.id}/edit`} draggable={false}>
                Edit
              </Link>
            </Button>
            <MoveToMenu
              promptId={prompt.id}
              currentFolderId={prompt.folderId}
              folders={folders}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Accessible "Move to…" dropdown — the keyboard/pointer fallback for DnD. */
function MoveToMenu({
  promptId,
  currentFolderId,
  folders,
}: {
  promptId: string;
  currentFolderId: string | null;
  folders: FolderOption[];
}) {
  const { move } = useLibraryDnd();

  function choose(target: string | null) {
    if (target !== currentFolderId) move(promptId, target);
  }

  return (
    <div className="ml-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Move to…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-64 w-48 overflow-auto"
        >
          <MoveOption
            label="Unfiled (root)"
            disabled={currentFolderId === null}
            onSelect={() => choose(null)}
          />
          {folders.length > 0 ? <DropdownMenuSeparator /> : null}
          {folders.map((f) => (
            <MoveOption
              key={f.id}
              label={f.name}
              disabled={currentFolderId === f.id}
              onSelect={() => choose(f.id)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MoveOption({
  label,
  disabled,
  onSelect,
}: {
  label: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onSelect}
      className="justify-between gap-2"
    >
      <span className="truncate">{label}</span>
      {disabled ? (
        <span className="text-muted-foreground text-xs">Current</span>
      ) : null}
    </DropdownMenuItem>
  );
}
