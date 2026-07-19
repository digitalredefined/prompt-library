"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setFavoriteAction } from "@/app/(protected)/library/actions";

/**
 * Star toggle for a prompt (DIG-29). Flips the star optimistically for instant
 * feedback, then calls the owner-scoped server action and refreshes to
 * reconcile (which also updates the Favorites filter/counts); reverts on error.
 */
export function FavoriteButton({
  promptId,
  favorite,
  className,
}: {
  promptId: string;
  favorite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(favorite);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !starred;
    setStarred(next);
    startTransition(async () => {
      try {
        await setFavoriteAction(promptId, next);
        router.refresh();
      } catch {
        setStarred(!next); // revert on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={starred}
      aria-label={starred ? "Unstar prompt" : "Star prompt"}
      title={starred ? "Starred — click to unstar" : "Star this prompt"}
      className={`rounded-md p-1 text-base leading-none transition-colors disabled:opacity-50 ${
        starred
          ? "text-amber-500"
          : "text-foreground/30 hover:text-foreground/70"
      } ${className ?? ""}`}
    >
      <span aria-hidden>{starred ? "★" : "☆"}</span>
    </button>
  );
}
