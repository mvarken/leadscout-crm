-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('EMAIL', 'PHONE', 'WEBSITE_FORM', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'CONTACT_LOGGED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "contactCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastContactedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "templateId" TEXT,
    "channel" "ContactChannel" NOT NULL,
    "direction" "ContactDirection" NOT NULL DEFAULT 'OUTGOING',
    "subject" TEXT,
    "message" TEXT,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTemplate_active_idx" ON "EmailTemplate"("active");

-- CreateIndex
CREATE INDEX "EmailTemplate_createdById_idx" ON "EmailTemplate"("createdById");

-- CreateIndex
CREATE INDEX "EmailTemplate_name_idx" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "ContactLog_leadId_idx" ON "ContactLog"("leadId");

-- CreateIndex
CREATE INDEX "ContactLog_userId_idx" ON "ContactLog"("userId");

-- CreateIndex
CREATE INDEX "ContactLog_templateId_idx" ON "ContactLog"("templateId");

-- CreateIndex
CREATE INDEX "ContactLog_channel_idx" ON "ContactLog"("channel");

-- CreateIndex
CREATE INDEX "ContactLog_contactedAt_idx" ON "ContactLog"("contactedAt");

-- CreateIndex
CREATE INDEX "Lead_lastContactedAt_idx" ON "Lead"("lastContactedAt");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
