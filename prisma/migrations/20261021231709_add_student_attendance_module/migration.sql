-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "RegisterStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "attendance_registers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "RegisterStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "recordId" TEXT,
    "schoolId" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousStatus" "AttendanceStatus",
    "newStatus" "AttendanceStatus",
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_registers_schoolId_idx" ON "attendance_registers"("schoolId");

-- CreateIndex
CREATE INDEX "attendance_registers_sectionId_date_idx" ON "attendance_registers"("sectionId", "date");

-- CreateIndex
CREATE INDEX "attendance_registers_academicYearId_sectionId_idx" ON "attendance_registers"("academicYearId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_registers_schoolId_academicYearId_sectionId_date_key" ON "attendance_registers"("schoolId", "academicYearId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "attendance_records_studentId_idx" ON "attendance_records"("studentId");

-- CreateIndex
CREATE INDEX "attendance_records_enrollmentId_idx" ON "attendance_records"("enrollmentId");

-- CreateIndex
CREATE INDEX "attendance_records_registerId_status_idx" ON "attendance_records"("registerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_registerId_studentId_key" ON "attendance_records"("registerId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_corrections_schoolId_idx" ON "attendance_corrections"("schoolId");

-- CreateIndex
CREATE INDEX "attendance_corrections_registerId_idx" ON "attendance_corrections"("registerId");

-- CreateIndex
CREATE INDEX "attendance_corrections_recordId_idx" ON "attendance_corrections"("recordId");

-- CreateIndex
CREATE INDEX "attendance_corrections_correctedById_idx" ON "attendance_corrections"("correctedById");

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "attendance_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "attendance_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
