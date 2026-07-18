"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { movePromptAction } from "@/app/(protected)/library/actions";

/**
 * Shared drag-and-drop context for moving prompts between folders (DIG-23).
 *
 * The prompt list and the folder sidebar live in sibling component trees, so the
 * drag source (a prompt card) and the drop target (a sidebar folder) coordinate
 * through the DOM's native dataTransfer for the drag itself, and through this
 * context for the resulting move + optimistic UI.
 *
 * `move` performs the mutation optimistically: if the moved prompt would leave
 * the currently-filtered view (e.g. dragged out of the folder being viewed), it
 * is added to `movedOut` so the list can hide it immediately; the server action
 * then runs and `router.refresh()` reconciles with real data. Wrapping the
 * provider around both the sidebar and the page keeps a single source of truth
 * for the active filter, the drag state, and the optimistic set.
 */

/** MIME-ish key carrying the dragged prompt id via dataTransfer. */
export const PROMPT_DND_TYPE = "application/x-prompt-id";

type MoveFn = (promptId: string, targetFolderId: string | null) => void;

type LibraryDndValue = {
  /** undefined → viewing all; null → viewing Unfiled; string → viewing a folder. */
  activeFolderId: string | null | undefined;
  /** Prompt ids optimistically removed from the current view. */
  movedOut: ReadonlySet<string>;
  /** True while a prompt is being dragged (so drop targets can show affordances). */
  dragging: boolean;
  setDragging: (v: boolean) => void;
  move: MoveFn;
};

const LibraryDndContext = createContext<LibraryDndValue | null>(null);

export function useLibraryDnd(): LibraryDndValue {
  const ctx = useContext(LibraryDndContext);
  if (!ctx) {
    throw new Error("useLibraryDnd must be used within <LibraryDndProvider>");
  }
  return ctx;
}

export function LibraryDndProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const folderParam = useSearchParams().get("folderId");
  const activeFolderId =
    folderParam === null
      ? undefined
      : folderParam === "none"
        ? null
        : folderParam;

  const [movedOut, setMovedOut] = useState<ReadonlySet<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  const move: MoveFn = (promptId, targetFolderId) => {
    // A move leaves the current view when we're filtered to a specific folder
    // (or Unfiled) and the target isn't that same bucket. The "all" view
    // (activeFolderId === undefined) never drops a card on move.
    const leavesView =
      activeFolderId !== undefined && targetFolderId !== activeFolderId;

    if (leavesView) {
      setMovedOut((prev) => new Set(prev).add(promptId));
    }

    startTransition(async () => {
      await movePromptAction(promptId, targetFolderId);
      router.refresh();
      // Reconciled with server data now; drop the optimistic marker.
      setMovedOut((prev) => {
        if (!prev.has(promptId)) return prev;
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
    });
  };

  return (
    <LibraryDndContext.Provider
      value={{ activeFolderId, movedOut, dragging, setDragging, move }}
    >
      {children}
    </LibraryDndContext.Provider>
  );
}
