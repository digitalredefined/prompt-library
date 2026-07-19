"use client";

import {
  FileTextIcon,
  KeyboardIcon,
  LibraryIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PromptIndexEntry = { id: string; title: string };

/** True when the keyboard event originates from an editable field — used to
 *  suppress single-key shortcuts while the user is typing. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** The documented shortcut set — rendered in the help dialog (DIG-37). */
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Search prompts" },
  { keys: ["N"], label: "New prompt" },
  { keys: ["C"], label: "Copy prompt (on a prompt page)" },
  { keys: ["?"], label: "Show this shortcuts help" },
];

/**
 * Global command palette + keyboard shortcuts (DIG-37). Mounted once (in the
 * authenticated header) so it's available on every signed-in page.
 *
 * - ⌘K / Ctrl+K toggles the palette (search + jump to a prompt, quick actions).
 * - When not typing in a field: `/` opens the palette, `n` creates a prompt,
 *   `?` opens the shortcuts help.
 *
 * The prompt list is fetched lazily (owner-scoped `/api/prompts/index`) the first
 * time the palette opens and filtered locally by cmdk.
 */
export function CommandMenu() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prompts, setPrompts] = useState<PromptIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Lazily load the prompt index the first time the palette opens.
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    fetch("/api/prompts/index")
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((data: { prompts?: PromptIndexEntry[] }) => {
        if (active) {
          setPrompts(data.prompts ?? []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [open, loaded]);

  // Global keyboard shortcuts.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // ⌘K / Ctrl+K toggles the palette from anywhere.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Remaining shortcuts are single-key and must not fire while typing or
      // when a modifier is held.
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target))
        return;

      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/library/new");
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // Run an action then close the palette.
  const run = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="text-muted-foreground hidden gap-2 sm:inline-flex"
      >
        <SearchIcon />
        <span>Search</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-1 inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Search prompts and run quick actions"
      >
        <CommandInput placeholder="Search prompts or type a command…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => run(() => router.push("/library/new"))}
            >
              <PlusIcon />
              <span>New prompt</span>
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/library"))}>
              <LibraryIcon />
              <span>Go to library</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
              }
            >
              {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              </span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                setHelpOpen(true);
              }}
            >
              <KeyboardIcon />
              <span>Keyboard shortcuts</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {prompts.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Jump to prompt">
                {prompts.map((p) => (
                  <CommandItem
                    key={p.id}
                    // Include the id so identically-titled prompts stay distinct
                    // in cmdk's value space, but only the title is shown.
                    value={`${p.title} ${p.id}`}
                    onSelect={() => run(() => router.push(`/library/${p.id}`))}
                  >
                    <FileTextIcon />
                    <span className="truncate">{p.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Speed up common actions. Single-key shortcuts are ignored while
              you’re typing in a field.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {SHORTCUTS.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-muted-foreground">{s.label}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="bg-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[11px] font-medium"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
