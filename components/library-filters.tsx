"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type CategoryOption = { id: string; name: string; color: string | null };
export type NamedOption = { id: string; name: string };

/**
 * Library filter bar (DIG-26). Folder, categories, and tags combine with AND —
 * a prompt shows only if it's in the selected folder (if any) AND has every
 * selected category AND every selected tag. All state lives in the URL
 * (`folderId`, repeated `categoryId`, repeated `tag`) so filtered views are
 * shareable/bookmarkable. Active filters render as removable chips; the "＋"
 * menus add categories/tags not already applied.
 */
export function LibraryFilters({
  folders,
  categories,
  tags,
}: {
  folders: NamedOption[];
  categories: CategoryOption[];
  tags: NamedOption[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const folderId = params.get("folderId");
  const activeCategoryIds = params.getAll("categoryId");
  const activeTagIds = params.getAll("tag");

  const byId = <T extends { id: string }>(list: T[], id: string) =>
    list.find((x) => x.id === id);

  const activeCategories = activeCategoryIds
    .map((id) => byId(categories, id))
    .filter((c): c is CategoryOption => Boolean(c));
  const activeTags = activeTagIds
    .map((id) => byId(tags, id))
    .filter((t): t is NamedOption => Boolean(t));

  const folderLabel =
    folderId === null
      ? null
      : folderId === "none"
        ? "Unfiled"
        : (byId(folders, folderId)?.name ?? "Folder");

  const hasActive =
    folderLabel !== null ||
    activeCategories.length > 0 ||
    activeTags.length > 0;

  // Navigate with a mutated query string; always reset pagination.
  function pushWith(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const addValue = (key: string, value: string) =>
    pushWith((p) => p.append(key, value));

  const removeValue = (key: string, value: string) =>
    pushWith((p) => {
      const kept = p.getAll(key).filter((v) => v !== value);
      p.delete(key);
      kept.forEach((v) => p.append(key, v));
    });

  const availableCategories = categories.filter(
    (c) => !activeCategoryIds.includes(c.id),
  );
  const availableTags = tags.filter((t) => !activeTagIds.includes(t.id));

  // Nothing to filter by and nothing active → don't render the bar at all.
  if (!hasActive && categories.length === 0 && tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {folderLabel !== null ? (
        <FilterChip onRemove={() => pushWith((p) => p.delete("folderId"))}>
          <span className="text-foreground/50">Folder:</span> {folderLabel}
        </FilterChip>
      ) : null}

      {activeCategories.map((c) => (
        <FilterChip key={c.id} onRemove={() => removeValue("categoryId", c.id)}>
          {c.color ? (
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: c.color }}
            />
          ) : null}
          {c.name}
        </FilterChip>
      ))}

      {activeTags.map((t) => (
        <FilterChip key={t.id} onRemove={() => removeValue("tag", t.id)}>
          #{t.name}
        </FilterChip>
      ))}

      {availableCategories.length > 0 ? (
        <AddMenu label="＋ Category">
          {(close) =>
            availableCategories.map((c) => (
              <MenuItem
                key={c.id}
                onSelect={() => {
                  addValue("categoryId", c.id);
                  close();
                }}
              >
                {c.color ? (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                ) : null}
                {c.name}
              </MenuItem>
            ))
          }
        </AddMenu>
      ) : null}

      {availableTags.length > 0 ? (
        <AddMenu label="＋ Tag">
          {(close) =>
            availableTags.map((t) => (
              <MenuItem
                key={t.id}
                onSelect={() => {
                  addValue("tag", t.id);
                  close();
                }}
              >
                #{t.name}
              </MenuItem>
            ))
          }
        </AddMenu>
      ) : null}

      {hasActive ? (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-foreground/50 hover:text-foreground ml-1 text-xs underline underline-offset-4"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="border-foreground/15 bg-foreground/[0.04] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-foreground/40 hover:text-foreground"
      >
        ✕
      </button>
    </span>
  );
}

/** Small dropdown for adding a category/tag filter; closes on outside click/Escape. */
function AddMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="border-foreground/15 text-foreground/60 hover:bg-foreground/5 rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors"
      >
        {label}
      </button>
      {open ? (
        <div
          role="menu"
          className="border-foreground/15 bg-background absolute left-0 z-10 mt-1 max-h-64 w-48 overflow-auto rounded-md border py-1 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="hover:bg-foreground/5 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
    >
      {children}
    </button>
  );
}
