import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export const metadata = {
  title: "Sign in · Prompt Library",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Already signed in → go home (or the requested destination).
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) {
    redirect(callbackUrl ?? "/");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-foreground/60 text-sm">
          Access your prompt library.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl ?? "/" });
        }}
      >
        <button
          type="submit"
          className="border-foreground/15 hover:bg-foreground/5 flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
