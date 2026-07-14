-- CreateEnum
CREATE TYPE "WordpressStatus" AS ENUM ('DETECTED', 'LIKELY', 'NOT_DETECTED', 'FAILED');

-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'WEBSITE_CHECKED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "hasContactPage" BOOLEAN,
ADD COLUMN     "hasImpressum" BOOLEAN,
ADD COLUMN     "hasPrivacyPolicy" BOOLEAN,
ADD COLUMN     "httpRedirectsToHttps" BOOLEAN,
ADD COLUMN     "httpsEnabled" BOOLEAN,
ADD COLUMN     "websiteCheckNotes" TEXT,
ADD COLUMN     "websiteCheckedAt" TIMESTAMP(3),
ADD COLUMN     "websiteEmail" TEXT,
ADD COLUMN     "websitePhone" TEXT,
ADD COLUMN     "websiteReachable" BOOLEAN,
ADD COLUMN     "wordpressStatus" "WordpressStatus";
