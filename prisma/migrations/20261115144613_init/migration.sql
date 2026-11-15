-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "Status" "TicketStatus"[] DEFAULT ARRAY['DRAFT']::"TicketStatus"[];
