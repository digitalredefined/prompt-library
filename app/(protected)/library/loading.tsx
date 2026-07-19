import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the library list (DIG-36). Rendered by Next.js while the
 * server component streams; mirrors the real layout (header, search row, card
 * grid) so the transition doesn't shift. The folder sidebar lives in the layout
 * and stays put.
 */
export default function LibraryLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-40" />
      </div>

      <Skeleton className="h-7 w-24 rounded-full" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-lg border p-4"
            aria-hidden
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-8 w-14" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your library…
      </span>
    </main>
  );
}
