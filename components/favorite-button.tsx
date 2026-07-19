"use client";

import { StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setFavoriteAction } from "@/app/(protected)/library/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={pending}
      aria-pressed={starred}
      aria-label={starred ? "Unstar prompt" : "Star prompt"}
      title={starred ? "Starred — click to unstar" : "Star this prompt"}
      className={cn(
        "size-8",
        starred
          ? "text-amber-500 hover:text-amber-500"
          : "text-muted-foreground/60",
        className,
      )}
    >
      <StarIcon
        className={cn("size-4", starred && "fill-current")}
        aria-hidden
      />
    </Button>
  );
}
