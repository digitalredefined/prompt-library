"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/**
 * Debounced library search box (DIG-27). The query lives in the URL as `q`, so
 * searched views are shareable/bookmarkable and combine with the DIG-26 filter
 * facets. Typing debounces before navigating; clearing removes `q`. Like the
 * filter bar, every change resets pagination.
 */
export function LibrarySearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlQuery = params.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reflect external URL changes (back/forward, "Clear all") into the input by
  // adjusting state during render — React's recommended alternative to syncing
  // in an effect (https://react.dev/learn/you-might-not-need-an-effect).
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setValue(urlQuery);
  }

  // Flush any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function schedule(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      const trimmed = next.trim();
      if (trimmed) p.set("q", trimmed);
      else p.delete("q");
      p.delete("page");
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative">
      <SearchIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => schedule(e.target.value)}
        placeholder="Search prompts…"
        aria-label="Search prompts"
        className="pl-9"
      />
    </div>
  );
}
