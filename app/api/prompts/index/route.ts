import { NextResponse } from "next/server";

import { listPromptIndex } from "@/lib/prompts";
import { getSessionUserOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Owner-scoped prompt index for the command palette (DIG-37). Returns a compact
 * `{ id, title }[]` the client palette filters locally for search-and-jump.
 * 401s (rather than redirecting) when unauthenticated.
 */
export async function GET() {
  const user = await getSessionUserOrNull();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prompts = await listPromptIndex(user.id);
  return NextResponse.json({ prompts });
}
