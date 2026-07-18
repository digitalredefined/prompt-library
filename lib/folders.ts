import type { Folder } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Owner-scoped folder reads. Full folder CRUD lands in DIG-21/22; for now the
 * prompt forms need the user's folders to populate a picker. Like lib/prompts,
 * every query is scoped by `ownerId`.
 */
export function listFolders(userId: string): Promise<Folder[]> {
  return prisma.folder.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
  });
}
