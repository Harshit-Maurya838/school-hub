-- CreateEnum
CREATE TYPE "InstructionMedium" AS ENUM ('ENGLISH', 'HINDI', 'BILINGUAL', 'URDU');

-- CreateEnum
CREATE TYPE "SchoolClassRange" AS ENUM ('CLASS_1_TO_5', 'CLASS_1_TO_8', 'CLASS_1_TO_10', 'CLASS_1_TO_12', 'CLASS_6_TO_8', 'CLASS_6_TO_10', 'CLASS_6_TO_12', 'CLASS_9_TO_10', 'CLASS_9_TO_12', 'CLASS_11_TO_12');

-- CreateEnum
CREATE TYPE "RteEntryClass" AS ENUM ('NURSERY', 'CLASS_1');

-- CreateEnum
CREATE TYPE "RteExitClass" AS ENUM ('CLASS_5', 'CLASS_8');

-- CreateEnum
CREATE TYPE "BoardAffiliation" AS ENUM ('CBSE', 'CISCE', 'STATE_BOARD', 'NIOS', 'IB', 'CAMBRIDGE');

-- CreateEnum
CREATE TYPE "SchoolStream" AS ENUM ('SCIENCE', 'ARTS', 'COMMERCE', 'AGRICULTURE', 'VOCATIONAL');

-- CreateEnum
CREATE TYPE "HosDesignation" AS ENUM ('PRINCIPAL', 'HEADMASTER', 'HEADMISTRESS', 'ACTING_PRINCIPAL', 'TEACHER_IN_CHARGE', 'DIRECTOR');

-- CreateTable
CREATE TABLE "school_profiles" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nameHindi" TEXT,
    "udiseCode" TEXT,
    "establishmentYear" INTEGER,
    "recognitionNumber" TEXT,
    "officialEmail" TEXT,
    "contactMobile" TEXT,
    "postalAddress" TEXT,
    "instructionMedium" "InstructionMedium",
    "classRange" "SchoolClassRange",
    "includesPrePrimary" BOOLEAN NOT NULL DEFAULT false,
    "rteApplicable" BOOLEAN NOT NULL DEFAULT false,
    "rteEntryClass" "RteEntryClass",
    "rteExitClass" "RteExitClass",
    "boardAffiliation" "BoardAffiliation",
    "stateBoardName" TEXT,
    "streams" "SchoolStream"[] DEFAULT ARRAY[]::"SchoolStream"[],
    "hosDesignation" "HosDesignation",
    "hosName" TEXT,
    "hosMobile" TEXT,
    "hosEmail" TEXT,
    "managementName" TEXT,
    "managementPhone" TEXT,
    "identityCompletedAt" TIMESTAMP(3),
    "academicCompletedAt" TIMESTAMP(3),
    "leadershipCompletedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_profiles_schoolId_key" ON "school_profiles"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "school_profiles_udiseCode_key" ON "school_profiles"("udiseCode");

-- CreateIndex
CREATE INDEX "school_profiles_schoolId_idx" ON "school_profiles"("schoolId");

-- AddForeignKey
ALTER TABLE "school_profiles" ADD CONSTRAINT "school_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_profiles" ADD CONSTRAINT "school_profiles_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
