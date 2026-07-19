"use client";

import { ChevronDownIcon, FolderIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { PROMPT_DND_TYPE, useLibraryDnd } from "@/components/library-dnd";
import { cn } from "@/lib/utils";
import type { FolderWithCount } from "@/lib/folders";
import {
  createFolderAction,
  deleteFolderAction,
  renameFolderAction,
} from "@/app/(protected)/library/folder-actions";
import {
  INITIAL_FORM_STATE,
  type FormState,
} from "@/app/(protected)/library/form-state";

/**
 * Folder tree navigation for the library (DIG-22).
 *
 * Server layout passes the flat, owner-scoped folder list (with per-folder
 * prompt counts); this client component assembles the tree, tracks
 * expand/collapse and inline-edit UI state, and reads the active `folderId` from
 * the URL to highlight the current filter. Folder mutations are the server
 * actions from `folder-actions` (built on the DIG-21 data layer); each
 * revalidates `/library`, re-rendering this component with fresh data.
 *
 * Folder rows and the Unfiled row are also drop targets for prompt drag-and-drop
 * (DIG-23): dropping a dragged prompt card moves it into that folder (or to the
 * root) via the shared DnD context.
 */

/**
 * Drop-target behaviour for a folder row. `target` is the destination folder id,
 * or null for the library root (Unfiled). Only reacts to prompt drags (ignores
 * other drag data), and reports a hover flag so the row can show an affordance.
 */
function usePromptDrop(target: string | null) {
  const { move, setDragging } = useLibraryDnd();
  const [over, setOver] = useState(false);

  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(PROMPT_DND_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const id =
        e.dataTransfer.getData(PROMPT_DND_TYPE) ||
        e.dataTransfer.getData("text/plain");
      setOver(false);
      setDragging(false);
      if (id) move(id, target);
    },
  };

  return { over, dropHandlers };
}

const dropRing = "ring-foreground/40 ring-2";

type TreeNode = FolderWithCount & { children: TreeNode[] };

/** Assemble the flat folder list into a parent→children tree (roots first). */
function buildTree(folders: FolderWithCount[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const f of folders) byId.set(f.id, { ...f, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node); // no parent, or a parent we can't see → treat as root
  }
  return roots;
}

const rowBase =
  "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors";
const linkBase = "flex-1 truncate";
const countBase = "text-foreground/40 text-xs tabular-nums";
const iconBtn =
  "text-foreground/40 hover:text-foreground rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100";

/**
 * Build a "/library" href that sets (or clears, when `value` is null) the folder
 * filter while preserving any active category/tag/search filters (DIG-26/27) and
 * resetting pagination. `value` is a folder id, "none" for Unfiled, or null for
 * All prompts. Folder and Favorites are mutually-exclusive primary scopes, so
 * choosing a folder scope also clears the Favorites filter (DIG-29).
 */
function useFolderHref() {
  const params = useSearchParams();
  return (value: string | null) => {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    p.delete("fav");
    if (value === null) p.delete("folderId");
    else p.set("folderId", value);
    const qs = p.toString();
    return qs ? `/library?${qs}` : "/library";
  };
}

/**
 * Build the "/library?fav=1" href for the Favorites scope (DIG-29): enable the
 * favorites filter, drop any folder scope, and reset pagination, while keeping
 * active category/tag/search filters so Favorites composes with them.
 */
function useFavoritesHref() {
  const params = useSearchParams();
  return () => {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    p.delete("folderId");
    p.set("fav", "1");
    return `/library?${p.toString()}`;
  };
}

export function FolderSidebar({
  folders,
  totalCount,
  unfiledCount,
  favoritesCount,
}: {
  folders: FolderWithCount[];
  totalCount: number;
  unfiledCount: number;
  favoritesCount: number;
}) {
  const tree = buildTree(folders);
  const params = useSearchParams();
  const activeFolderId = params.get("folderId");
  const activeFav = params.get("fav") === "1";
  const hrefForFolder = useFolderHref();
  const hrefForFavorites = useFavoritesHref();
  // "All prompts" is the scope only when neither a folder nor Favorites is active.
  const allActive = activeFolderId === null && !activeFav;
  const [addingRoot, setAddingRoot] = useState(false);

  // On small screens the sidebar collapses behind a "Folders" toggle (DIG-35).
  // Selecting a scope navigates (the URL query changes), so close the drawer
  // whenever the active filter changes to reveal the results underneath. We
  // reconcile during render (React's recommended pattern for deriving state
  // from a changing prop) rather than in an effect.
  const [mobileOpen, setMobileOpen] = useState(false);
  const paramsKey = params.toString();
  const [seenParamsKey, setSeenParamsKey] = useState(paramsKey);
  if (seenParamsKey !== paramsKey) {
    setSeenParamsKey(paramsKey);
    setMobileOpen(false);
  }

  // A short label for the currently-active scope, shown on the collapsed bar.
  const activeLabel = activeFav
    ? "Favorites"
    : activeFolderId === null
      ? "All prompts"
      : activeFolderId === "none"
        ? "Unfiled"
        : (folders.find((f) => f.id === activeFolderId)?.name ?? "Folders");

  return (
    <div className="border-foreground/10 w-full border-b md:w-64 md:shrink-0 md:border-r md:border-b-0">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-controls="folder-nav"
        className="hover:bg-foreground/5 flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium transition-colors md:hidden"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Folders</span>
          <span className="text-foreground/40 truncate font-normal">
            · {activeLabel}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 transition-transform",
            mobileOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <nav
        id="folder-nav"
        aria-label="Folders"
        className={cn(
          "flex-col gap-1 p-4 md:flex",
          mobileOpen ? "flex" : "hidden",
        )}
      >
        {/* All prompts — clears the folder + favorites filters (keeps category/tag). */}
        <Link
          href={hrefForFolder(null)}
          className={`${rowBase} ${
            allActive ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
          }`}
          aria-current={allActive ? "page" : undefined}
        >
          <span className={linkBase}>All prompts</span>
          <span className={countBase}>{totalCount}</span>
        </Link>

        {/* Favorites — cross-cutting scope for starred prompts (DIG-29). */}
        <Link
          href={hrefForFavorites()}
          className={`${rowBase} ${
            activeFav ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
          }`}
          aria-current={activeFav ? "page" : undefined}
        >
          <span className={`${linkBase} flex items-center gap-1.5`}>
            <span aria-hidden className="text-amber-500">
              ★
            </span>
            Favorites
          </span>
          <span className={countBase}>{favoritesCount}</span>
        </Link>

        <div className="text-foreground/40 flex items-center justify-between px-2 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
          <span>Folders</span>
          <button
            type="button"
            onClick={() => setAddingRoot((v) => !v)}
            className="hover:text-foreground text-base leading-none transition-colors"
            aria-label="New folder"
            aria-expanded={addingRoot}
          >
            +
          </button>
        </div>

        {addingRoot ? (
          <CreateFolderForm
            parentId={null}
            onDone={() => setAddingRoot(false)}
            autoFocus
          />
        ) : null}

        {tree.length === 0 && !addingRoot ? (
          <p className="text-foreground/40 px-2 py-1 text-xs">
            No folders yet — use{" "}
            <span className="text-foreground/60 font-medium">+</span> to create
            one.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {tree.map((node) => (
              <FolderNode
                key={node.id}
                node={node}
                depth={0}
                activeFolderId={activeFolderId}
              />
            ))}
          </ul>
        )}

        {/* Unfiled — prompts with no folder. Hidden when there are none. */}
        {unfiledCount > 0 ? (
          <UnfiledRow active={activeFolderId === "none"} count={unfiledCount} />
        ) : null}
      </nav>
    </div>
  );
}

/** The "Unfiled" (root) row — a filter link that also accepts prompt drops. */
function UnfiledRow({ active, count }: { active: boolean; count: number }) {
  const { over, dropHandlers } = usePromptDrop(null);
  const hrefForFolder = useFolderHref();
  return (
    <Link
      href={hrefForFolder("none")}
      {...dropHandlers}
      className={`${rowBase} mt-1 ${over ? dropRing : ""} ${
        active ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`${linkBase} text-foreground/70 italic`}>Unfiled</span>
      <span className={countBase}>{count}</span>
    </Link>
  );
}

function FolderNode({
  node,
  depth,
  activeFolderId,
}: {
  node: TreeNode;
  depth: number;
  activeFolderId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { over, dropHandlers } = usePromptDrop(node.id);
  const hrefForFolder = useFolderHref();

  const hasChildren = node.children.length > 0;
  const active = activeFolderId === node.id;
  // Indent by depth; base padding already 0.5rem (px-2).
  const indent = { paddingLeft: `${0.5 + depth * 0.85}rem` };

  return (
    <li>
      {renaming ? (
        <div style={indent}>
          <RenameFolderForm folder={node} onDone={() => setRenaming(false)} />
        </div>
      ) : (
        <div
          {...dropHandlers}
          className={`${rowBase} ${over ? dropRing : ""} ${
            active ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
          }`}
          style={indent}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-foreground/40 hover:text-foreground w-4 shrink-0 text-xs transition-colors"
              aria-label={expanded ? "Collapse" : "Expand"}
              aria-expanded={expanded}
            >
              {expanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}

          <Link
            href={hrefForFolder(node.id)}
            className={linkBase}
            aria-current={active ? "page" : undefined}
          >
            {node.name}
          </Link>
          <span className={countBase}>{node.promptCount}</span>

          <button
            type="button"
            onClick={() => {
              setAddingChild(true);
              setExpanded(true);
            }}
            className={iconBtn}
            aria-label={`Add subfolder in ${node.name}`}
            title="Add subfolder"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className={iconBtn}
            aria-label={`Rename ${node.name}`}
            title="Rename"
          >
            ✎
          </button>
          <DeleteFolderControl
            folder={node}
            confirming={confirmingDelete}
            setConfirming={setConfirmingDelete}
          />
        </div>
      )}

      {addingChild ? (
        <div style={{ paddingLeft: `${0.5 + (depth + 1) * 0.85}rem` }}>
          <CreateFolderForm
            parentId={node.id}
            onDone={() => setAddingChild(false)}
            autoFocus
          />
        </div>
      ) : null}

      {hasChildren && expanded ? (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Inline create form. `parentId` null creates a root folder. */
function CreateFolderForm({
  parentId,
  onDone,
  autoFocus,
}: {
  parentId: string | null;
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const [state, formAction] = useActionState(
    createFolderAction,
    INITIAL_FORM_STATE,
  );
  useCloseOnSuccess(state, onDone);

  return (
    <form action={formAction} className="flex flex-col gap-1 px-2 py-1">
      {parentId ? (
        <input type="hidden" name="parentId" value={parentId} />
      ) : null}
      <div className="flex items-center gap-1">
        <input
          name="name"
          autoFocus={autoFocus}
          placeholder="Folder name"
          aria-label="New folder name"
          maxLength={120}
          className="border-foreground/15 focus:border-foreground/40 min-w-0 flex-1 rounded border bg-transparent px-1.5 py-1 text-sm outline-none"
        />
        <SubmitIcon label="Create folder">✓</SubmitIcon>
        <button
          type="button"
          onClick={onDone}
          className="text-foreground/50 hover:text-foreground px-1 text-sm"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
      <FieldError state={state} />
    </form>
  );
}

/** Inline rename form, prefilled with the current name. */
function RenameFolderForm({
  folder,
  onDone,
}: {
  folder: FolderWithCount;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(
    renameFolderAction.bind(null, folder.id),
    INITIAL_FORM_STATE,
  );
  useCloseOnSuccess(state, onDone);

  return (
    <form action={formAction} className="flex flex-col gap-1 px-2 py-1">
      <div className="flex items-center gap-1">
        <input
          name="name"
          autoFocus
          defaultValue={folder.name}
          aria-label="Folder name"
          maxLength={120}
          className="border-foreground/15 focus:border-foreground/40 min-w-0 flex-1 rounded border bg-transparent px-1.5 py-1 text-sm outline-none"
        />
        <SubmitIcon label="Save name">✓</SubmitIcon>
        <button
          type="button"
          onClick={onDone}
          className="text-foreground/50 hover:text-foreground px-1 text-sm"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
      <FieldError state={state} />
    </form>
  );
}

/** Two-step delete confirm; the delete itself is a bound server action. */
function DeleteFolderControl({
  folder,
  confirming,
  setConfirming,
}: {
  folder: FolderWithCount;
  confirming: boolean;
  setConfirming: (v: boolean) => void;
}) {
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${iconBtn} hover:text-red-600 dark:hover:text-red-400`}
        aria-label={`Delete ${folder.name}`}
        title="Delete"
      >
        🗑
      </button>
    );
  }
  return (
    <form
      action={deleteFolderAction.bind(null, folder.id)}
      className="flex items-center gap-1"
      // Keep the confirm affordances visible even without hover.
    >
      <SubmitIcon
        label={`Confirm delete ${folder.name}`}
        className="text-red-600 dark:text-red-400"
      >
        ✓
      </SubmitIcon>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-foreground/50 hover:text-foreground px-0.5 text-xs"
        aria-label="Cancel delete"
      >
        ✕
      </button>
    </form>
  );
}

/** Submit button rendered as a small icon, disabled while the action runs. */
function SubmitIcon({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className={`text-foreground/60 hover:text-foreground px-0.5 text-sm disabled:opacity-40 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function FieldError({ state }: { state: FormState }) {
  const message = state.error ?? state.fieldErrors?.name?.[0];
  if (!message) return null;
  return (
    <p className="px-1 text-xs text-red-600 dark:text-red-400">{message}</p>
  );
}

/**
 * Close an inline form once its action completes successfully. `useActionState`
 * keeps the same state object identity until an action returns, so we watch for
 * a resolved, error-free state and only fire `onDone` on the transition (guarded
 * by a ref so the initial mount — also `ok: true` — doesn't close it).
 */
function useCloseOnSuccess(state: FormState, onDone: () => void) {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return; // unchanged (incl. first mount)
    seen.current = state;
    if (state.ok && !state.error && !state.fieldErrors) onDone();
  }, [state, onDone]);
}
