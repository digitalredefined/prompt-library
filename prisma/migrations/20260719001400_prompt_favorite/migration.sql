-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Prompt_ownerId_favorite_idx" ON "Prompt"("ownerId", "favorite");
