import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the prompt detail view (DIG-36). Mirrors the detail
 * layout — back link, title + actions, meta row, and the prompt body block —
 * while the server component fetches the owner-scoped prompt.
 */
export default function PromptDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-20" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>

      <span className="sr-only" role="status">
        Loading prompt…
      </span>
    </main>
  );
}
