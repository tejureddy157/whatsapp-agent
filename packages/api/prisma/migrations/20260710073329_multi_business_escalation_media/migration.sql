-- DropIndex
DROP INDEX "Customer_waPhoneNumber_idx";
DROP INDEX "Customer_waPhoneNumber_key";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "needsHumanAttention" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: backfill existing customers under the one business connected
-- so far, then drop the default — new rows must specify it explicitly.
ALTER TABLE "Customer" ADD COLUMN     "businessPhoneNumberId" TEXT NOT NULL DEFAULT '1178230075376768',
ADD COLUMN     "firstMessageText" TEXT;
ALTER TABLE "Customer" ALTER COLUMN "businessPhoneNumberId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaMimeType" TEXT,
ADD COLUMN     "mediaType" TEXT;

-- CreateIndex
CREATE INDEX "Customer_businessPhoneNumberId_idx" ON "Customer"("businessPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_waPhoneNumber_businessPhoneNumberId_key" ON "Customer"("waPhoneNumber", "businessPhoneNumberId");
