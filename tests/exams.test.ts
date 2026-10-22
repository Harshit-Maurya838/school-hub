import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { hashPassword } from "../src/lib/password.js";
import {
  Role,
  ExamType,
  ExamStatus,
  ExamMarksSubmissionStatus,
} from "../src/generated/prisma/enums.js";
import {
  createExam,
  updateExam,
  updateExamStatus,
  configureExamClassesAndSubjects,
  getTeacherAssignedExamSubjects,
  getExamMarksRoster,
  saveMarksDraft,
  submitMarks,
  returnMarksForCorrection,
  approveMarks,
  publishExamResults,
  adminCorrectMarks,
  getExamReports,
} from "../src/lib/exam.js";
import { BadRequestError, ForbiddenError } from "../src/lib/errors.js";
import { AuthenticatedUser } from "../src/lib/auth.js";

import { GET as getExamsHandler } from "../src/app/api/v1/school/[schoolSlug]/exams/route.js";
import { GET as getExamDetailsHandler } from "../src/app/api/v1/school/[schoolSlug]/exams/[examId]/route.js";
import { GET as getTeacherAssignmentsHandler } from "../src/app/api/v1/school/[schoolSlug]/exams/[examId]/teacher-assignments/route.js";
import { GET as getReportsHandler } from "../src/app/api/v1/school/[schoolSlug]/exams/[examId]/reports/route.js";

function createAuthRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
) {
  const headers = new Headers();
  if (options.token) {
    headers.set("Cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  }
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Phase 11: Production-Ready Examinations and Marks Management Test Matrix", () => {
  const SCH_CODE = "EXAM_TEST_SCH_01";
  const SCH_SLUG = "exam-test-sch-01";
  const FOREIGN_SCH_CODE = "EXAM_TEST_SCH_02";
  const FOREIGN_SCH_SLUG = "exam-test-sch-02";

  let school: { id: string; name: string; slug: string };
  let foreignSchool: { id: string; name: string; slug: string };
  let currentYear: { id: string; name: string };

  let grade10: { id: string; name: string };
  let grade9: { id: string; name: string };
  let sec10A: { id: string; name: string };
  let sec10B: { id: string; name: string };

  let mathSubject: { id: string; name: string };
  let scienceSubject: { id: string; name: string };
  let englishSubject: { id: string; name: string };

  let adminUser: AuthenticatedUser;
  let foreignAdminUser: AuthenticatedUser;
  let mathTeacherUser: AuthenticatedUser;
  let scienceTeacherUser: AuthenticatedUser;
  let classOnlyTeacherUser: AuthenticatedUser;
  let accountantUser: AuthenticatedUser;

  let student1: { id: string; name: string };
  let student2: { id: string; name: string };
  let student10B: { id: string; name: string };

  let tokenAdmin: string;
  let tokenForeignAdmin: string;
  let tokenMathTeacher: string;
  let tokenAccountant: string;

  async function cleanup() {
    await prisma.examMarkCorrection.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.studentExamMark.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.examSectionSubject.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.examSubjectConfig.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.examClass.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.exam.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.subjectTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.classTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.enrollment.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.student.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.teacherProfile.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.subject.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@exam-test.edu",
            "foreign-admin@exam-test.edu",
            "mathteacher@exam-test.edu",
            "scienceteacher@exam-test.edu",
            "classonlyteacher@exam-test.edu",
            "accountant@exam-test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } },
    });
  }

  before(async () => {
    await cleanup();

    const passwordHash = await hashPassword("Secret123!");

    // 1. Create primary & foreign schools
    school = await prisma.school.create({
      data: {
        name: "Exam Primary Academy",
        code: SCH_CODE,
        slug: SCH_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    foreignSchool = await prisma.school.create({
      data: {
        name: "Foreign Exam Institute",
        code: FOREIGN_SCH_CODE,
        slug: FOREIGN_SCH_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    // 2. Academic Year
    currentYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026-27",
        startDate: new Date(Date.UTC(2026, 3, 1)),
        endDate: new Date(Date.UTC(2027, 2, 31)),
        isCurrent: true,
      },
    });

    // 3. Classes and Sections
    grade10 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 10", numericOrder: 10 },
    });
    grade9 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 9", numericOrder: 9 },
    });

    sec10A = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Section A", capacity: 40 },
    });
    sec10B = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Section B", capacity: 40 },
    });

    // 4. Subjects
    mathSubject = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Mathematics", code: "MTH10" },
    });
    scienceSubject = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Science", code: "SCI10" },
    });
    englishSubject = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade9.id, name: "English 9", code: "ENG09" },
    });

    // 5. Users and Profiles
    adminUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Exam Admin",
        email: "admin@exam-test.edu",
        role: "SCHOOL_ADMIN",
        passwordHash,
        isActive: true,
      },
    });

    foreignAdminUser = await prisma.user.create({
      data: {
        schoolId: foreignSchool.id,
        name: "Foreign Admin",
        email: "foreign-admin@exam-test.edu",
        role: "SCHOOL_ADMIN",
        passwordHash,
        isActive: true,
      },
    });

    mathTeacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Math Teacher Alice",
        email: "mathteacher@exam-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: true,
      },
    });
    const mathTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: mathTeacherUser.id,
        status: "ACTIVE",
      },
    });

    scienceTeacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Science Teacher Bob",
        email: "scienceteacher@exam-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: true,
      },
    });
    const scienceTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: scienceTeacherUser.id,
        status: "ACTIVE",
      },
    });

    classOnlyTeacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Class-Only Teacher Charlie",
        email: "classonlyteacher@exam-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: true,
      },
    });
    const classOnlyTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: classOnlyTeacherUser.id,
        status: "ACTIVE",
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Accountant Alan",
        email: "accountant@exam-test.edu",
        role: "ACCOUNTANT",
        passwordHash,
        isActive: true,
      },
    });

    // Assign Math Teacher to 10-A Math
    await prisma.subjectTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        subjectId: mathSubject.id,
        teacherProfileId: mathTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // Assign Science Teacher to 10-A Science
    await prisma.subjectTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        subjectId: scienceSubject.id,
        teacherProfileId: scienceTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // Assign Class-Only Teacher as Class Teacher for 10-A (NO subject teacher assignment)
    await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        teacherProfileId: classOnlyTeacherProfile.id,
        status: "ACTIVE",
        isPrimary: true,
      },
    });

    // 6. Students and Enrollments
    student1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-EXAM-001",
        name: "Student One",
        dob: new Date("2010-01-01"),
        gender: "FEMALE",
        isActive: true,
      },
    });
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        rollNumber: "101",
        status: "ACTIVE",
      },
    });

    student2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-EXAM-002",
        name: "Student Two",
        dob: new Date("2010-02-02"),
        gender: "MALE",
        isActive: true,
      },
    });
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student2.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        rollNumber: "102",
        status: "ACTIVE",
      },
    });

    student10B = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-EXAM-003",
        name: "Student Other Section",
        dob: new Date("2010-03-03"),
        gender: "OTHER",
        isActive: true,
      },
    });
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student10B.id,
        sectionId: sec10B.id,
        academicYearId: currentYear.id,
        rollNumber: "201",
        status: "ACTIVE",
      },
    });

    // Tokens
    tokenAdmin = await createSessionToken({
      userId: adminUser.id,
      email: "admin@exam-test.edu",
      role: Role.SCHOOL_ADMIN,
      schoolId: school.id,
    });
    tokenForeignAdmin = await createSessionToken({
      userId: foreignAdminUser.id,
      email: "foreign-admin@exam-test.edu",
      role: Role.SCHOOL_ADMIN,
      schoolId: foreignSchool.id,
    });
    tokenMathTeacher = await createSessionToken({
      userId: mathTeacherUser.id,
      email: "mathteacher@exam-test.edu",
      role: Role.TEACHER,
      schoolId: school.id,
    });
    tokenAccountant = await createSessionToken({
      userId: accountantUser.id,
      email: "accountant@exam-test.edu",
      role: Role.ACCOUNTANT,
      schoolId: school.id,
    });
  });

  after(async () => {
    await cleanup();
  });

  let createdExamId: string;

  // ==========================================================================
  // Group 1: Admin Examination Management & Life Cycle
  // ==========================================================================
  describe("1. Admin Examination Management", () => {
    it("should allow school admin to create an examination in DRAFT status", async () => {
      const exam = await createExam(school.id, adminUser, {
        name: "Mid-Term Examination 2026",
        type: ExamType.MID_TERM,
        description: "Official mid-term assessment",
        startDate: "2026-10-10",
        endDate: "2026-10-25",
        academicYearId: currentYear.id,
      });

      assert.ok(exam.id);
      assert.strictEqual(exam.name, "Mid-Term Examination 2026");
      assert.strictEqual(exam.status, ExamStatus.DRAFT);
      assert.strictEqual(exam.schoolId, school.id);
      createdExamId = exam.id;
    });

    it("should reject duplicate examination name in the same academic year", async () => {
      await assert.rejects(
        async () => {
          await createExam(school.id, adminUser, {
            name: "Mid-Term Examination 2026",
            type: ExamType.MID_TERM,
            startDate: "2026-10-10",
            endDate: "2026-10-25",
            academicYearId: currentYear.id,
          });
        },
        (err: unknown) => err instanceof BadRequestError && err.message.includes("already exists")
      );
    });

    it("should reject invalid date range (start date > end date)", async () => {
      await assert.rejects(
        async () => {
          await createExam(school.id, adminUser, {
            name: "Invalid Date Exam",
            type: ExamType.UNIT_TEST,
            startDate: "2026-10-30",
            endDate: "2026-10-10",
            academicYearId: currentYear.id,
          });
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("start date cannot be later")
      );
    });

    it("should allow admin to update examination metadata in DRAFT status", async () => {
      const updated = await updateExam(school.id, adminUser, createdExamId, {
        description: "Updated description for mid-term",
      });
      assert.strictEqual(updated.description, "Updated description for mid-term");
    });

    it("should configure participating classes and subject-level marks rules", async () => {
      const configured = await configureExamClassesAndSubjects(
        school.id,
        adminUser,
        createdExamId,
        {
          classIds: [grade10.id],
          subjectConfigs: [
            {
              classId: grade10.id,
              subjectId: mathSubject.id,
              maxMarks: 100,
              passMarks: 35,
            },
            {
              classId: grade10.id,
              subjectId: scienceSubject.id,
              maxMarks: 100,
              passMarks: 40,
            },
          ],
        }
      );

      assert.strictEqual(configured.classes.length, 1);
      assert.strictEqual(configured.subjectConfigs.length, 2);
    });

    it("should reject subject configuration if subject does not belong to the class", async () => {
      await assert.rejects(
        async () => {
          await configureExamClassesAndSubjects(school.id, adminUser, createdExamId, {
            classIds: [grade10.id],
            subjectConfigs: [
              {
                classId: grade10.id,
                subjectId: englishSubject.id, // English belongs to Grade 9!
                maxMarks: 100,
                passMarks: 35,
              },
            ],
          });
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("does not belong to class")
      );
    });

    it("should reject invalid marks rules (passMarks > maxMarks)", async () => {
      await assert.rejects(
        async () => {
          await configureExamClassesAndSubjects(school.id, adminUser, createdExamId, {
            classIds: [grade10.id],
            subjectConfigs: [
              {
                classId: grade10.id,
                subjectId: mathSubject.id,
                maxMarks: 50,
                passMarks: 60, // Invalid!
              },
            ],
          });
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("cannot exceed maximum marks")
      );
    });

    it("should transition lifecycle correctly: DRAFT -> SCHEDULED -> MARKS_ENTRY", async () => {
      const scheduled = await updateExamStatus(
        school.id,
        adminUser,
        createdExamId,
        ExamStatus.SCHEDULED
      );
      assert.strictEqual(scheduled.status, ExamStatus.SCHEDULED);

      const openForEntry = await updateExamStatus(
        school.id,
        adminUser,
        createdExamId,
        ExamStatus.MARKS_ENTRY
      );
      assert.strictEqual(openForEntry.status, ExamStatus.MARKS_ENTRY);
    });

    it("should reject invalid lifecycle transitions (e.g. MARKS_ENTRY -> DRAFT directly)", async () => {
      await assert.rejects(
        async () => {
          await updateExamStatus(school.id, adminUser, createdExamId, ExamStatus.DRAFT);
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("Invalid lifecycle transition")
      );
    });
  });

  // ==========================================================================
  // Group 2: Tenant Isolation
  // ==========================================================================
  describe("2. Tenant Isolation & Cross-School Access Rejection", () => {
    it("should reject cross-tenant exam access via API", async () => {
      const req = createAuthRequest(
        `http://localhost/api/v1/school/${SCH_SLUG}/exams/${createdExamId}`,
        { token: tokenForeignAdmin }
      );
      const res = await getExamDetailsHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG, examId: createdExamId }),
      });
      assert.strictEqual(res.status, 403);
    });

    it("should reject accountant from viewing examination records", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/exams`, {
        token: tokenAccountant,
      });
      const res = await getExamsHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // ==========================================================================
  // Group 3: Subject-Teacher Assignment Enforcement
  // ==========================================================================
  describe("3. Subject-Teacher Assignment Enforcement", () => {
    it("should return only assigned subject-sections for the math teacher", async () => {
      const assigned = await getTeacherAssignedExamSubjects(
        school.id,
        mathTeacherUser,
        createdExamId
      );

      assert.strictEqual(assigned.length, 1);
      assert.strictEqual(assigned[0].subjectId, mathSubject.id);
      assert.strictEqual(assigned[0].sectionId, sec10A.id);
    });

    it("should allow assigned math teacher to get roster for 10-A Math", async () => {
      const roster = await getExamMarksRoster(
        school.id,
        mathTeacherUser,
        createdExamId,
        sec10A.id,
        mathSubject.id
      );

      assert.strictEqual(roster.students.length, 2);
      assert.strictEqual(roster.config.maxMarks, 100);
      assert.strictEqual(roster.config.passMarks, 35);
    });

    it("should DENY math teacher from accessing roster for 10-A Science (unassigned subject)", async () => {
      await assert.rejects(
        async () => {
          await getExamMarksRoster(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10A.id,
            scienceSubject.id
          );
        },
        (err: unknown) =>
          err instanceof ForbiddenError && err.message.includes("not authorized to enter marks")
      );
    });

    it("should DENY Class-Teacher alone from accessing marks roster without subject assignment", async () => {
      // Charlie is Class Teacher of 10-A, but has NO SubjectTeacherAssignment
      await assert.rejects(
        async () => {
          await getExamMarksRoster(
            school.id,
            classOnlyTeacherUser,
            createdExamId,
            sec10A.id,
            mathSubject.id
          );
        },
        (err: unknown) =>
          err instanceof ForbiddenError && err.message.includes("not authorized to enter marks")
      );
    });

    it("should DENY unassigned teacher from entering marks for Section 10-B", async () => {
      await assert.rejects(
        async () => {
          await saveMarksDraft(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10B.id,
            mathSubject.id,
            { entries: [] }
          );
        },
        (err: unknown) => err instanceof ForbiddenError
      );
    });
  });

  // ==========================================================================
  // Group 4: Student Roster & Marks Validation
  // ==========================================================================
  describe("4. Student Roster & Marks Boundaries Validation", () => {
    it("should reject marks entry for a student not enrolled in the section", async () => {
      await assert.rejects(
        async () => {
          await saveMarksDraft(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10A.id,
            mathSubject.id,
            {
              entries: [
                {
                  studentId: student10B.id, // Enrolled in 10-B, not 10-A!
                  marksObtained: 80,
                },
              ],
            }
          );
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("not actively enrolled")
      );
    });

    it("should reject marks exceeding maximum marks (e.g. 105 when max is 100)", async () => {
      await assert.rejects(
        async () => {
          await saveMarksDraft(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10A.id,
            mathSubject.id,
            {
              entries: [
                {
                  studentId: student1.id,
                  marksObtained: 105,
                },
              ],
            }
          );
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("cannot exceed maximum marks")
      );
    });

    it("should reject negative marks", async () => {
      await assert.rejects(
        async () => {
          await saveMarksDraft(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10A.id,
            mathSubject.id,
            {
              entries: [
                {
                  studentId: student1.id,
                  marksObtained: -5,
                },
              ],
            }
          );
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("cannot be negative")
      );
    });

    it("should save draft marks and preserve partial state", async () => {
      const roster = await saveMarksDraft(
        school.id,
        mathTeacherUser,
        createdExamId,
        sec10A.id,
        mathSubject.id,
        {
          entries: [
            {
              studentId: student1.id,
              marksObtained: 88,
              remarks: "Good performance",
            },
          ],
        }
      );

      assert.strictEqual(roster.workflow.status, ExamMarksSubmissionStatus.DRAFT);
      const s1 = roster.students.find((s) => s.studentId === student1.id);
      assert.strictEqual(s1?.marksObtained, 88);
      assert.strictEqual(s1?.status, "ENTERED");

      const s2 = roster.students.find((s) => s.studentId === student2.id);
      assert.strictEqual(s2?.status, "UNMARKED");
    });
  });

  // ==========================================================================
  // Group 5: Absence Handling & Incomplete Submission Prevention
  // ==========================================================================
  describe("5. Absence Handling & Incomplete Submission Guard", () => {
    it("should reject submission if any enrolled student is unmarked", async () => {
      // student2 is still UNMARKED
      await assert.rejects(
        async () => {
          await submitMarks(school.id, mathTeacherUser, createdExamId, sec10A.id, mathSubject.id);
        },
        (err: unknown) => err instanceof BadRequestError && err.message.includes("remain unmarked")
      );
    });

    it("should allow explicit absence entry without setting numeric marks to zero", async () => {
      const roster = await saveMarksDraft(
        school.id,
        mathTeacherUser,
        createdExamId,
        sec10A.id,
        mathSubject.id,
        {
          entries: [
            {
              studentId: student2.id,
              isAbsent: true,
              remarks: "Medical leave",
            },
          ],
        }
      );

      const s2 = roster.students.find((s) => s.studentId === student2.id);
      assert.strictEqual(s2?.isAbsent, true);
      assert.strictEqual(s2?.marksObtained, null);
      assert.strictEqual(s2?.status, "ABSENT");
    });

    it("should successfully submit marks when all students are accounted for", async () => {
      const submitted = await submitMarks(
        school.id,
        mathTeacherUser,
        createdExamId,
        sec10A.id,
        mathSubject.id
      );

      assert.strictEqual(submitted.status, ExamMarksSubmissionStatus.SUBMITTED);
      assert.ok(submitted.submittedAt);
      assert.strictEqual(submitted.submittedById, mathTeacherUser.id);
    });

    it("should lock marks editing once submitted", async () => {
      await assert.rejects(
        async () => {
          await saveMarksDraft(
            school.id,
            mathTeacherUser,
            createdExamId,
            sec10A.id,
            mathSubject.id,
            {
              entries: [
                {
                  studentId: student1.id,
                  marksObtained: 95,
                },
              ],
            }
          );
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("already been submitted")
      );
    });
  });

  // ==========================================================================
  // Group 6: Review, Return for Correction, Approval & Publication
  // ==========================================================================
  describe("6. Admin Review, Return, Re-submission, Approval & Publication", () => {
    it("should allow school admin to return marks for correction with feedback reason", async () => {
      const returned = await returnMarksForCorrection(
        school.id,
        adminUser,
        createdExamId,
        sec10A.id,
        mathSubject.id,
        "Please re-check student 1 answer booklet question 4"
      );

      assert.strictEqual(returned.status, ExamMarksSubmissionStatus.RETURNED);
      assert.strictEqual(
        returned.reviewNotes,
        "Please re-check student 1 answer booklet question 4"
      );
    });

    it("should allow teacher to edit and re-submit returned marks", async () => {
      // Teacher updates student 1 score to 92
      await saveMarksDraft(school.id, mathTeacherUser, createdExamId, sec10A.id, mathSubject.id, {
        entries: [
          {
            studentId: student1.id,
            marksObtained: 92,
            remarks: "Recalculated question 4",
          },
        ],
      });

      const reSubmitted = await submitMarks(
        school.id,
        mathTeacherUser,
        createdExamId,
        sec10A.id,
        mathSubject.id
      );
      assert.strictEqual(reSubmitted.status, ExamMarksSubmissionStatus.SUBMITTED);
    });

    it("should allow admin to approve marks submission", async () => {
      const approved = await approveMarks(
        school.id,
        adminUser,
        createdExamId,
        sec10A.id,
        mathSubject.id
      );
      assert.strictEqual(approved.status, ExamMarksSubmissionStatus.APPROVED);
    });

    it("should DENY teacher from publishing examination results", async () => {
      await assert.rejects(
        async () => {
          await publishExamResults(school.id, mathTeacherUser, createdExamId);
        },
        (err: unknown) =>
          err instanceof ForbiddenError && err.message.includes("Only school administrators")
      );
    });

    it("should allow school admin to publish examination results", async () => {
      const published = await publishExamResults(school.id, adminUser, createdExamId);
      assert.strictEqual(published.status, ExamStatus.PUBLISHED);
      assert.ok(published.publishedAt);
    });
  });

  // ==========================================================================
  // Group 7: Administrative Corrections & Auditing
  // ==========================================================================
  describe("7. Administrative Correction Workflow & Audit Log", () => {
    it("should allow admin to correct published marks with an audited reason", async () => {
      const markRecord = await prisma.studentExamMark.findFirst({
        where: { examId: createdExamId, studentId: student1.id },
      });
      assert.ok(markRecord);

      const { correction, updatedMark } = await adminCorrectMarks(
        school.id,
        adminUser,
        createdExamId,
        {
          studentMarkId: markRecord.id,
          newMarks: 94,
          reason: "Scrutiny committee found 2 extra marks in question 7",
        }
      );

      assert.strictEqual(updatedMark.marksObtained, 94);
      assert.strictEqual(correction.previousMarks, 92);
      assert.strictEqual(correction.newMarks, 94);
      assert.strictEqual(correction.correctedById, adminUser.id);
      assert.strictEqual(correction.reason, "Scrutiny committee found 2 extra marks in question 7");
    });

    it("should record audit logs for exam operations", async () => {
      const logs = await prisma.auditLog.findMany({
        where: { schoolId: school.id },
        orderBy: { createdAt: "desc" },
      });

      const actions = logs.map((l) => l.action);
      assert.ok(actions.includes("EXAM_CREATED"));
      assert.ok(actions.includes("MARKS_DRAFT_SAVED"));
      assert.ok(actions.includes("MARKS_SUBMITTED"));
      assert.ok(actions.includes("MARKS_RETURNED"));
      assert.ok(actions.includes("MARKS_APPROVED"));
      assert.ok(actions.includes("EXAM_RESULTS_PUBLISHED"));
      assert.ok(actions.includes("MARKS_ADMIN_CORRECTED"));
    });
  });

  // ==========================================================================
  // Group 8: Concurrency & Duplicate Prevention
  // ==========================================================================
  describe("8. Concurrency & Duplicate Mark Prevention", () => {
    it("should guarantee unique student mark records per exam and subject", async () => {
      const markRecords = await prisma.studentExamMark.findMany({
        where: {
          examId: createdExamId,
          studentId: student1.id,
          subjectId: mathSubject.id,
        },
      });

      assert.strictEqual(markRecords.length, 1);
    });
  });

  // ==========================================================================
  // Group 9: Reports & Statistical Summary
  // ==========================================================================
  describe("9. Reports & Statistical Accuracy", () => {
    it("should compute subject-level pass/fail counts and statistics accurately", async () => {
      const reports = await getExamReports(school.id, adminUser, createdExamId);

      assert.strictEqual(reports.exam.status, ExamStatus.PUBLISHED);
      assert.ok(reports.completion.percentage > 0);

      const mathSummary = reports.subjectSummaries.find(
        (s) => s.subjectId === mathSubject.id && s.sectionId === sec10A.id
      );

      assert.ok(mathSummary);
      assert.strictEqual(mathSummary.appeared, 1); // Student 1 appeared, Student 2 was absent
      assert.strictEqual(mathSummary.absent, 1);
      assert.strictEqual(mathSummary.passed, 1); // Student 1 has 94 marks >= 35 passMarks
      assert.strictEqual(mathSummary.failed, 0);
      assert.strictEqual(mathSummary.passPercentage, 100);
      assert.strictEqual(mathSummary.highestMarks, 94);
      assert.strictEqual(mathSummary.averageMarks, 94); // Absent student is NOT treated as 0 in average!
    });

    it("should compute student exam result summaries correctly", async () => {
      const reports = await getExamReports(school.id, adminUser, createdExamId);

      const s1Summary = reports.studentSummaries.find((s) => s.studentId === student1.id);
      assert.ok(s1Summary);
      assert.strictEqual(s1Summary.overallStatus, "PASS");
      assert.strictEqual(s1Summary.totalMarksObtained, 94);

      const s2Summary = reports.studentSummaries.find((s) => s.studentId === student2.id);
      assert.ok(s2Summary);
      assert.strictEqual(s2Summary.overallStatus, "FAIL"); // Absent counted as fail for overall result
    });
  });

  // ==========================================================================
  // Group 10: API Endpoints Integration
  // ==========================================================================
  describe("10. API Endpoints Integration", () => {
    it("GET /exams: lists exams with HTTP 200", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/exams`, {
        token: tokenAdmin,
      });
      const res = await getExamsHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 1);
    });

    it("GET /teacher-assignments: returns assigned subjects with HTTP 200", async () => {
      const req = createAuthRequest(
        `http://localhost/api/v1/school/${SCH_SLUG}/exams/${createdExamId}/teacher-assignments`,
        { token: tokenMathTeacher }
      );
      const res = await getTeacherAssignmentsHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG, examId: createdExamId }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.length, 1);
      assert.strictEqual(json.data[0].subjectId, mathSubject.id);
    });

    it("GET /reports: returns full report data with HTTP 200", async () => {
      const req = createAuthRequest(
        `http://localhost/api/v1/school/${SCH_SLUG}/exams/${createdExamId}/reports`,
        { token: tokenAdmin }
      );
      const res = await getReportsHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG, examId: createdExamId }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.completion);
      assert.ok(json.data.subjectSummaries);
      assert.ok(json.data.studentSummaries);
    });
  });
});
