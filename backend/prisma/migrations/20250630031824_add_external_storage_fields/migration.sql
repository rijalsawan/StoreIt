-- AlterTable
ALTER TABLE "files" ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "storageMetadata" TEXT,
ADD COLUMN     "storageProvider" TEXT,
ADD COLUMN     "storageUrl" TEXT;
