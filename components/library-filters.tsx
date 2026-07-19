"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <span className="text-muted-foreground">Folder:</span> {folderLabel}
        </FilterChip>
      ) : null}

      {activeCategories.map((c) => (
        <FilterChip key={c.id} onRemove={() => removeValue("categoryId", c.id)}>
          {c.color ? (
            <span
              aria-hidden
              className="size-2 rounded-full"
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
        <AddMenu label="Category">
          {availableCategories.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => addValue("categoryId", c.id)}
            >
              {c.color ? (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
              ) : null}
              {c.name}
            </DropdownMenuItem>
          ))}
        </AddMenu>
      ) : null}

      {availableTags.length > 0 ? (
        <AddMenu label="Tag">
          {availableTags.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => addValue("tag", t.id)}>
              #{t.name}
            </DropdownMenuItem>
          ))}
        </AddMenu>
      ) : null}

      {hasActive ? (
        <Button
          variant="link"
          size="sm"
          onClick={() => router.push(pathname)}
          className="text-muted-foreground hover:text-foreground h-auto px-1"
        >
          Clear all
        </Button>
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
    <Badge variant="secondary" className="gap-1.5 py-1 pr-1 pl-2.5">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-sm p-0.5"
      >
        <XIcon className="size-3" />
      </button>
    </Badge>
  );
}

/** Dropdown for adding a category/tag filter, built on the shared DropdownMenu. */
function AddMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground rounded-full border-dashed"
        >
          <PlusIcon />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-64 w-48 overflow-auto"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
