-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('UNIT_TEST', 'MID_TERM', 'FINAL', 'QUARTERLY', 'PRACTICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'MARKS_ENTRY', 'UNDER_REVIEW', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExamMarksSubmissionStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subject_configs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "passMarks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_subject_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_section_subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "ExamMarksSubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_section_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_exam_marks" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "examSectionSubjectId" TEXT,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_exam_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_mark_corrections" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentMarkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "previousMarks" DOUBLE PRECISION,
    "newMarks" DOUBLE PRECISION,
    "previousAbsent" BOOLEAN NOT NULL DEFAULT false,
    "newAbsent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_mark_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_schoolId_idx" ON "exams"("schoolId");

-- CreateIndex
CREATE INDEX "exams_academicYearId_idx" ON "exams"("academicYearId");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exams_schoolId_academicYearId_name_key" ON "exams"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "exam_classes_schoolId_idx" ON "exam_classes"("schoolId");

-- CreateIndex
CREATE INDEX "exam_classes_classId_idx" ON "exam_classes"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_classes_examId_classId_key" ON "exam_classes"("examId", "classId");

-- CreateIndex
CREATE INDEX "exam_subject_configs_schoolId_idx" ON "exam_subject_configs"("schoolId");

-- CreateIndex
CREATE INDEX "exam_subject_configs_examId_idx" ON "exam_subject_configs"("examId");

-- CreateIndex
CREATE INDEX "exam_subject_configs_subjectId_idx" ON "exam_subject_configs"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subject_configs_examId_classId_subjectId_key" ON "exam_subject_configs"("examId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "exam_section_subjects_schoolId_idx" ON "exam_section_subjects"("schoolId");

-- CreateIndex
CREATE INDEX "exam_section_subjects_examId_idx" ON "exam_section_subjects"("examId");

-- CreateIndex
CREATE INDEX "exam_section_subjects_sectionId_idx" ON "exam_section_subjects"("sectionId");

-- CreateIndex
CREATE INDEX "exam_section_subjects_subjectId_idx" ON "exam_section_subjects"("subjectId");

-- CreateIndex
CREATE INDEX "exam_section_subjects_status_idx" ON "exam_section_subjects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exam_section_subjects_examId_sectionId_subjectId_key" ON "exam_section_subjects"("examId", "sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "student_exam_marks_schoolId_idx" ON "student_exam_marks"("schoolId");

-- CreateIndex
CREATE INDEX "student_exam_marks_examId_idx" ON "student_exam_marks"("examId");

-- CreateIndex
CREATE INDEX "student_exam_marks_studentId_idx" ON "student_exam_marks"("studentId");

-- CreateIndex
CREATE INDEX "student_exam_marks_enrollmentId_idx" ON "student_exam_marks"("enrollmentId");

-- CreateIndex
CREATE INDEX "student_exam_marks_sectionId_idx" ON "student_exam_marks"("sectionId");

-- CreateIndex
CREATE INDEX "student_exam_marks_subjectId_idx" ON "student_exam_marks"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "student_exam_marks_examId_studentId_subjectId_key" ON "student_exam_marks"("examId", "studentId", "subjectId");

-- CreateIndex
CREATE INDEX "exam_mark_corrections_schoolId_idx" ON "exam_mark_corrections"("schoolId");

-- CreateIndex
CREATE INDEX "exam_mark_corrections_examId_idx" ON "exam_mark_corrections"("examId");

-- CreateIndex
CREATE INDEX "exam_mark_corrections_studentMarkId_idx" ON "exam_mark_corrections"("studentMarkId");

-- CreateIndex
CREATE INDEX "exam_mark_corrections_studentId_idx" ON "exam_mark_corrections"("studentId");

-- CreateIndex
CREATE INDEX "exam_mark_corrections_correctedById_idx" ON "exam_mark_corrections"("correctedById");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_subjects" ADD CONSTRAINT "exam_section_subjects_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_examSectionSubjectId_fkey" FOREIGN KEY ("examSectionSubjectId") REFERENCES "exam_section_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_marks" ADD CONSTRAINT "student_exam_marks_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_studentMarkId_fkey" FOREIGN KEY ("studentMarkId") REFERENCES "student_exam_marks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_mark_corrections" ADD CONSTRAINT "exam_mark_corrections_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
