"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Delete control with a confirmation dialog (DIG-18) built on the shared
 * shadcn `Dialog` (DIG-34). The actual delete is a server action (bound with the
 * prompt id) passed in from the server component.
 */
export function DeletePromptButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2Icon aria-hidden />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this prompt?</DialogTitle>
          <DialogDescription>
            This permanently removes the prompt and its version history. This
            action can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <form action={action}>
            <ConfirmDeleteButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "Deleting…" : "Delete prompt"}
    </Button>
  );
}
