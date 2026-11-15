/*
  Warnings:

  - A unique constraint covering the columns `[eventId,name]` on the table `TicketType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_eventId_name_key" ON "TicketType"("eventId", "name");

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
