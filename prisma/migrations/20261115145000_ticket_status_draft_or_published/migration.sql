-- Replace the ticket status list with one status value.
CREATE TYPE "TicketStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'VALID', 'USED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "TicketType" ADD COLUMN "status" "TicketStatus_new" NOT NULL DEFAULT 'DRAFT';

UPDATE "TicketType"
SET "status" = CASE
  WHEN 'VALID' = ANY("Status") THEN 'VALID'::"TicketStatus_new"
  WHEN 'USED' = ANY("Status") THEN 'USED'::"TicketStatus_new"
  WHEN 'CANCELLED' = ANY("Status") THEN 'CANCELLED'::"TicketStatus_new"
  WHEN 'REFUNDED' = ANY("Status") THEN 'REFUNDED'::"TicketStatus_new"
  ELSE 'DRAFT'::"TicketStatus_new"
END;

ALTER TABLE "TicketType" DROP COLUMN "Status";

DROP TYPE "TicketStatus";

ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
