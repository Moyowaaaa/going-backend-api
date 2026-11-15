-- TicketType status only tracks the type lifecycle.
-- Issued-ticket states (VALID, USED, CANCELLED, REFUNDED) are not used by this table.
-- This migration refuses to run if any row would have to be rewritten.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TicketType"
    WHERE status::text NOT IN ('DRAFT', 'PUBLISHED')
  ) THEN
    RAISE EXCEPTION 'Refusing to narrow ticket status: TicketType rows exist outside DRAFT and PUBLISHED';
  END IF;
END $$;

CREATE TYPE "TicketTypeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "TicketType" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "TicketType"
  ALTER COLUMN "status" TYPE "TicketTypeStatus"
  USING status::text::"TicketTypeStatus";

ALTER TABLE "TicketType" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "TicketStatus";
