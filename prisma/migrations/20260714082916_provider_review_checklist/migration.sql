-- AlterTable
ALTER TABLE "DirectoryProviderConfig" ADD COLUMN     "licensedAccessReviewedAt" TIMESTAMP(3),
ADD COLUMN     "privacyReviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewCompletedAt" TIMESTAMP(3),
ADD COLUMN     "robotsTxtReviewedAt" TIMESTAMP(3),
ADD COLUMN     "termsReviewedAt" TIMESTAMP(3);
