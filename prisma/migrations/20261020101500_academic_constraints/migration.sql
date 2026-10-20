-- Create partial unique index to enforce at most one current academic year per school
CREATE UNIQUE INDEX "academic_years_schoolId_isCurrent_key"
ON "academic_years"("schoolId")
WHERE "isCurrent" = true;

-- Add check constraint for positive capacity on sections
ALTER TABLE "sections" ADD CONSTRAINT "sections_capacity_check"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

-- Create partial unique index for school-wide subject names (where classId IS NULL)
CREATE UNIQUE INDEX "subjects_schoolId_name_schoolwide_key"
ON "subjects"("schoolId", "name")
WHERE "classId" IS NULL;

-- Create unique index for class-specific subject names (where classId IS NOT NULL)
CREATE UNIQUE INDEX "subjects_schoolId_classId_name_key"
ON "subjects"("schoolId", "classId", "name")
WHERE "classId" IS NOT NULL;
