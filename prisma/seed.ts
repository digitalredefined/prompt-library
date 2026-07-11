import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed script scaffold.
 *
 * Real seed data (a demo user with sample prompts, folders, categories, and
 * tags) will be added once those models exist (DIG-8). Run with:
 *
 *   npm run db:seed
 */
async function main() {
  await prisma.healthCheck.upsert({
    where: { id: "seed-healthcheck" },
    update: {},
    create: { id: "seed-healthcheck", note: "seeded" },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
