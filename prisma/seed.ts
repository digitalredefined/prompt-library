import { PrismaClient, PromptSource } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed script — creates a demo user with a couple of folders, categories,
 * tags, and prompts (including one with version history). Idempotent: safe to
 * run repeatedly. Run with `npm run db:seed`.
 */
async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@promptlibrary.local" },
    update: {},
    create: {
      email: "demo@promptlibrary.local",
      name: "Demo User",
    },
  });

  // Folders (one nested under the other).
  const writingFolder = await prisma.folder.upsert({
    where: { id: "seed-folder-writing" },
    update: {},
    create: { id: "seed-folder-writing", name: "Writing", ownerId: user.id },
  });

  await prisma.folder.upsert({
    where: { id: "seed-folder-blog" },
    update: {},
    create: {
      id: "seed-folder-blog",
      name: "Blog Posts",
      ownerId: user.id,
      parentId: writingFolder.id,
    },
  });

  // Category + tag.
  const marketing = await prisma.category.upsert({
    where: { ownerId_name: { ownerId: user.id, name: "Marketing" } },
    update: {},
    create: { name: "Marketing", color: "#f7c8c1", ownerId: user.id },
  });

  const emailTag = await prisma.tag.upsert({
    where: { ownerId_name: { ownerId: user.id, name: "email" } },
    update: {},
    create: { name: "email", ownerId: user.id },
  });

  // A prompt with one AI-optimized version in its history.
  await prisma.prompt.upsert({
    where: { id: "seed-prompt-cold-email" },
    update: {},
    create: {
      id: "seed-prompt-cold-email",
      title: "Cold outreach email",
      body: "Write a friendly cold email introducing our product to a busy founder.",
      notes: "Keep under 120 words.",
      ownerId: user.id,
      folderId: writingFolder.id,
      categories: { connect: { id: marketing.id } },
      tags: { connect: { id: emailTag.id } },
      versions: {
        create: [
          {
            title: "Cold outreach email",
            body: "Write a cold email introducing our product to a founder.",
            source: PromptSource.MANUAL,
          },
          {
            title: "Cold outreach email",
            body: "Write a concise, friendly cold email (<120 words) that introduces our product to a time-pressed founder and ends with a single clear call to action.",
            source: PromptSource.AI,
          },
        ],
      },
    },
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
