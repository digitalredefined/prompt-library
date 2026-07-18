"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { PROMPT_DND_TYPE, useLibraryDnd } from "@/components/library-dnd";

/** Minimal, serializable prompt shape the list needs (built on the server). */
export type PromptCard = {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  shared: boolean;
  updatedLabel: string;
};

export type FolderOption = { id: string; name: string };

const actionBtn =
  "border-foreground/15 hover:bg-foreground/5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors";

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
}: {
  prompts: PromptCard[];
  folders: FolderOption[];
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
              {prompt.title}
            </Link>
            {prompt.shared ? (
              <span className="text-foreground/50 shrink-0 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                Shared
              </span>
            ) : null}
          </div>
          <p className="text-foreground/50 line-clamp-2 flex-1 text-sm">
            {prompt.body}
          </p>
          <span className="text-foreground/40 text-xs">
            Updated {prompt.updatedLabel}
          </span>
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/library/${prompt.id}`}
              draggable={false}
              className={actionBtn}
            >
              Open
            </Link>
            <CopyButton text={prompt.body} className={actionBtn} />
            <Link
              href={`/library/${prompt.id}/edit`}
              draggable={false}
              className={actionBtn}
            >
              Edit
            </Link>
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(target: string | null) {
    setOpen(false);
    if (target !== currentFolderId) move(promptId, target);
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={actionBtn}
      >
        Move to…
      </button>
      {open ? (
        <div
          role="menu"
          className="border-foreground/15 bg-background absolute right-0 z-10 mt-1 max-h-64 w-48 overflow-auto rounded-md border py-1 shadow-lg"
        >
          <MoveOption
            label="Unfiled (root)"
            disabled={currentFolderId === null}
            onSelect={() => choose(null)}
          />
          {folders.length > 0 ? (
            <div className="border-foreground/10 my-1 border-t" />
          ) : null}
          {folders.map((f) => (
            <MoveOption
              key={f.id}
              label={f.name}
              disabled={currentFolderId === f.id}
              onSelect={() => choose(f.id)}
            />
          ))}
        </div>
      ) : null}
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
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="hover:bg-foreground/5 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-40"
    >
      <span className="truncate">{label}</span>
      {disabled ? (
        <span className="text-foreground/40 text-xs">Current</span>
      ) : null}
    </button>
  );
}
