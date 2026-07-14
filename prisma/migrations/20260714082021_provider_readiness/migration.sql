-- CreateEnum
CREATE TYPE "DirectoryProviderStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'DISABLED');

-- CreateTable
CREATE TABLE "DirectoryProviderConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "robotsTxtUrl" TEXT,
    "termsUrl" TEXT,
    "status" "DirectoryProviderStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "crawlDelaySeconds" INTEGER NOT NULL DEFAULT 10,
    "maxResultsPerJob" INTEGER NOT NULL DEFAULT 25,
    "requiresManualApproval" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryProviderConfig_key_key" ON "DirectoryProviderConfig"("key");

-- CreateIndex
CREATE INDEX "DirectoryProviderConfig_status_idx" ON "DirectoryProviderConfig"("status");

-- CreateIndex
CREATE INDEX "DirectoryProviderConfig_key_idx" ON "DirectoryProviderConfig"("key");
