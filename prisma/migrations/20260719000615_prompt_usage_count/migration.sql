-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Prompt_ownerId_usageCount_idx" ON "Prompt"("ownerId", "usageCount");
