import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting the database connection pool. In production a fresh client is
// created per server instance.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
