-- CreateEnum
CREATE TYPE "PromptVisibility" AS ENUM ('PRIVATE', 'UNLISTED');

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "shareSlug" TEXT,
ADD COLUMN     "visibility" "PromptVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_shareSlug_key" ON "Prompt"("shareSlug");

