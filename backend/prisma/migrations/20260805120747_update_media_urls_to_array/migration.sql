/*
  Warnings:

  - You are about to drop the column `media_url` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "media_url",
ADD COLUMN     "media_urls" TEXT[];
