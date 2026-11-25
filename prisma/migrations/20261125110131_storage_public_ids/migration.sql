/*
  Warnings:

  - Added the required column `publicId` to the `EventImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "CoverImagePublicId" TEXT;

-- AlterTable
ALTER TABLE "EventImage" ADD COLUMN     "publicId" TEXT NOT NULL;
