-- AlterTable: single category -> multiple categories
ALTER TABLE "Event" ADD COLUMN "categories" "EventCategory"[] NOT NULL DEFAULT ARRAY['OTHER'::"EventCategory"];

-- Carry existing single categories over instead of dropping them
UPDATE "Event" SET "categories" = ARRAY["category"]::"EventCategory"[];

ALTER TABLE "Event" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "Event_categories_idx" ON "Event"("categories");
