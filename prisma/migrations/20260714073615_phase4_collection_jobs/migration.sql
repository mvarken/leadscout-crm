-- CreateEnum
CREATE TYPE "CollectionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DirectoryResultStatus" AS ENUM ('NEW', 'CONVERTED', 'IGNORED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "CollectionJob" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "state" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "limit" INTEGER NOT NULL DEFAULT 10,
    "status" "CollectionJobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "leadId" TEXT,
    "externalId" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "status" "DirectoryResultStatus" NOT NULL DEFAULT 'NEW',
    "duplicateReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionJob_provider_idx" ON "CollectionJob"("provider");

-- CreateIndex
CREATE INDEX "CollectionJob_status_idx" ON "CollectionJob"("status");

-- CreateIndex
CREATE INDEX "CollectionJob_createdAt_idx" ON "CollectionJob"("createdAt");

-- CreateIndex
CREATE INDEX "DirectoryResult_jobId_idx" ON "DirectoryResult"("jobId");

-- CreateIndex
CREATE INDEX "DirectoryResult_leadId_idx" ON "DirectoryResult"("leadId");

-- CreateIndex
CREATE INDEX "DirectoryResult_source_idx" ON "DirectoryResult"("source");

-- CreateIndex
CREATE INDEX "DirectoryResult_status_idx" ON "DirectoryResult"("status");

-- CreateIndex
CREATE INDEX "DirectoryResult_companyName_idx" ON "DirectoryResult"("companyName");

-- AddForeignKey
ALTER TABLE "CollectionJob" ADD CONSTRAINT "CollectionJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryResult" ADD CONSTRAINT "DirectoryResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CollectionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryResult" ADD CONSTRAINT "DirectoryResult_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
