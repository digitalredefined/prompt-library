/* eslint-disable @next/next/no-img-element */
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Account · Prompt Library",
};

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-foreground/60 text-sm">
          Your profile details, from your Google sign-in.
        </p>
      </div>

      <section className="border-foreground/10 flex items-center gap-4 rounded-lg border p-5">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full text-lg font-semibold">
            {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-medium">{user.name ?? "—"}</span>
          <span className="text-foreground/60 text-sm">{user.email}</span>
        </div>
      </section>

      <dl className="border-foreground/10 divide-foreground/10 divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-foreground/60">Name</dt>
          <dd className="font-medium">{user.name ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-foreground/60">Email</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
      </dl>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
