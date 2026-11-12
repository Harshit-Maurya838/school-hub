-- AlterTable
ALTER TABLE "school_profiles" ADD COLUMN     "includesPlayGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "school_registrations" ADD COLUMN     "details" JSONB,
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT,
ADD COLUMN     "passwordHash" TEXT;
