import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { hashPassword } from "../src/lib/password.js";
import { Role } from "../src/generated/prisma/enums.js";
import { normalizeAttendanceDate, saveAttendanceDraft } from "../src/lib/attendance.js";
import { BadRequestError } from "../src/lib/errors.js";
import { GET as getOverviewHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/overview/route.js";
import { GET as getRegisterHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/register/route.js";
import { POST as postDraftHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/register/draft/route.js";
import { POST as postSubmitHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/register/submit/route.js";
import { POST as postCorrectHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/register/correct/route.js";
import { GET as getHistoryHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/history/route.js";
import { GET as getReportsHandler } from "../src/app/api/v1/school/[schoolSlug]/attendance/reports/route.js";

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

describe("Phase 10: Production-Ready Daily Student Attendance Test Matrix", () => {
  const SCH_CODE = "ATT_TEST_SCH_01";
  const SCH_SLUG = "att-test-sch-01";
  const FOREIGN_SCH_CODE = "ATT_TEST_SCH_02";
  const FOREIGN_SCH_SLUG = "att-test-sch-02";

  let school: { id: string; name: string; slug: string };
  let currentYear: { id: string; name: string };

  let grade10: { id: string; name: string };
  let grade9: { id: string; name: string };
  let sec10A: { id: string; name: string };
  let sec10B: { id: string; name: string };

  let schoolAdminUser: {
    id: string;
    name: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };
  let classTeacherUser: {
    id: string;
    name: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };
  let classTeacherProfile: { id: string };
  let subjectOnlyTeacherUser: {
    id: string;
    name: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };
  let subjectOnlyTeacherProfile: { id: string };
  let accountantUser: {
    id: string;
    name: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };
  let inactiveUser: {
    id: string;
    name: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };

  let student1: { id: string; name: string; admissionNumber: string };
  let student2: { id: string; name: string; admissionNumber: string };
  let student3Archived: { id: string; name: string; admissionNumber: string };
  let studentOtherSection: { id: string; name: string; admissionNumber: string };

  let tokenSchoolAdmin: string;
  let tokenClassTeacher: string;
  let tokenSubjectTeacher: string;
  let tokenAccountant: string;
  let tokenInactive: string;

  async function cleanup() {
    await prisma.attendanceCorrection.deleteMany({
      where: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } },
    });
    await prisma.attendanceRecord.deleteMany({
      where: { register: { school: { code: { in: [SCH_CODE, FOREIGN_SCH_CODE] } } } },
    });
    await prisma.attendanceRegister.deleteMany({
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
            "admin@att-test.edu",
            "classteacher@att-test.edu",
            "subjectonly@att-test.edu",
            "accountant@att-test.edu",
            "inactive@att-test.edu",
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

    // Create Schools
    school = await prisma.school.create({
      data: {
        name: "Attendance Primary School",
        code: SCH_CODE,
        slug: SCH_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    await prisma.school.create({
      data: {
        name: "Foreign High School",
        code: FOREIGN_SCH_CODE,
        slug: FOREIGN_SCH_SLUG,
        isActive: true,
        status: "ACTIVE",
      },
    });

    // Create Academic Years
    currentYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026-27",
        startDate: new Date(Date.UTC(2026, 3, 1)),
        endDate: new Date(Date.UTC(2027, 2, 31)),
        isCurrent: true,
      },
    });

    await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2025-26",
        startDate: new Date(Date.UTC(2025, 3, 1)),
        endDate: new Date(Date.UTC(2026, 2, 31)),
        isCurrent: false,
      },
    });

    // Create Classes & Sections
    grade10 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 10", numericOrder: 10 },
    });
    grade9 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 9", numericOrder: 9 },
    });

    sec10A = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Section A", capacity: 35 },
    });
    sec10B = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Section B", capacity: 35 },
    });
    await prisma.section.create({
      data: { schoolId: school.id, classId: grade9.id, name: "Section A", capacity: 30 },
    });

    // Create Subject
    const mathSub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Mathematics", code: "MATH10" },
    });

    // Create Users
    schoolAdminUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Admin Alice",
        email: "admin@att-test.edu",
        role: "SCHOOL_ADMIN",
        passwordHash,
        isActive: true,
      },
    });

    classTeacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Teacher Charlie",
        email: "classteacher@att-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: true,
      },
    });

    classTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: classTeacherUser.id,
        status: "ACTIVE",
        designation: "Senior Educator",
      },
    });

    subjectOnlyTeacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Teacher Dave",
        email: "subjectonly@att-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: true,
      },
    });

    subjectOnlyTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: subjectOnlyTeacherUser.id,
        status: "ACTIVE",
        designation: "Subject Teacher",
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Accountant Frank",
        email: "accountant@att-test.edu",
        role: "ACCOUNTANT",
        passwordHash,
        isActive: true,
      },
    });

    inactiveUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Inactive Ian",
        email: "inactive@att-test.edu",
        role: "TEACHER",
        passwordHash,
        isActive: false, // Inactive account
      },
    });

    // Assign Class Teacher to Sec 10A in current year
    await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        teacherProfileId: classTeacherProfile.id,
        isPrimary: true,
        status: "ACTIVE",
      },
    });

    // Assign Subject Teacher to Sec 10A Math in current year (Subject Only)
    await prisma.subjectTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        subjectId: mathSub.id,
        teacherProfileId: subjectOnlyTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // Create Students
    student1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-ATT-001",
        name: "Aaron Burr",
        dob: new Date("2011-05-10"),
        gender: "MALE",
        isActive: true,
      },
    });

    student2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-ATT-002",
        name: "Bella Swan",
        dob: new Date("2011-08-20"),
        gender: "FEMALE",
        isActive: true,
      },
    });

    student3Archived = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-ATT-003",
        name: "Archived Andy",
        dob: new Date("2011-01-15"),
        gender: "MALE",
        isActive: false,
        deletedAt: new Date(),
      },
    });

    studentOtherSection = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-ATT-004",
        name: "Other Oscar",
        dob: new Date("2011-09-01"),
        gender: "MALE",
        isActive: true,
      },
    });

    // Active Enrollments
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        rollNumber: "01",
        status: "ACTIVE",
      },
    });

    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student2.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        rollNumber: "02",
        status: "ACTIVE",
      },
    });

    // Archived student enrollment
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student3Archived.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        rollNumber: "03",
        status: "DROPPED",
      },
    });

    // Student enrolled in different section (sec10B)
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: studentOtherSection.id,
        sectionId: sec10B.id,
        academicYearId: currentYear.id,
        rollNumber: "01",
        status: "ACTIVE",
      },
    });

    // Generate Session Tokens
    tokenSchoolAdmin = await createSessionToken({
      userId: schoolAdminUser.id,
      schoolId: school.id,
      role: "SCHOOL_ADMIN",
      email: schoolAdminUser.email,
    });

    tokenClassTeacher = await createSessionToken({
      userId: classTeacherUser.id,
      schoolId: school.id,
      role: "TEACHER",
      email: classTeacherUser.email,
    });

    tokenSubjectTeacher = await createSessionToken({
      userId: subjectOnlyTeacherUser.id,
      schoolId: school.id,
      role: "TEACHER",
      email: subjectOnlyTeacherUser.email,
    });

    tokenAccountant = await createSessionToken({
      userId: accountantUser.id,
      schoolId: school.id,
      role: "ACCOUNTANT",
      email: accountantUser.email,
    });

    tokenInactive = await createSessionToken({
      userId: inactiveUser.id,
      schoolId: school.id,
      role: "TEACHER",
      email: inactiveUser.email,
    });
  });

  after(async () => {
    await cleanup();
  });

  // --------------------------------------------------------------------------
  // 1. Date normalization & timezone edge cases
  // --------------------------------------------------------------------------
  it("1. Date normalization: guarantees UTC midnight and rejects invalid calendar dates", () => {
    const valid = normalizeAttendanceDate("2026-10-22");
    assert.strictEqual(valid.dateStr, "2026-10-22");
    assert.strictEqual(valid.date.toISOString(), "2026-10-22T00:00:00.000Z");

    // Invalid format
    assert.throws(() => normalizeAttendanceDate("22-10-2026"), BadRequestError);
    assert.throws(() => normalizeAttendanceDate("invalid"), BadRequestError);

    // Invalid calendar dates (e.g. Feb 30th)
    assert.throws(() => normalizeAttendanceDate("2026-02-30"), BadRequestError);
    assert.throws(() => normalizeAttendanceDate("2026-04-31"), BadRequestError);
  });

  // --------------------------------------------------------------------------
  // 2. Class Teacher: permitted for assigned section, denied for unassigned section
  // --------------------------------------------------------------------------
  it("2. Class teacher access: allowed for assigned section (10A), denied for unassigned section (10B)", async () => {
    // 1. Overview check
    const reqOverview = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/overview`,
      { token: tokenClassTeacher }
    );
    const resOverview = await getOverviewHandler(reqOverview, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resOverview.status, 200);
    const dataOverview = await resOverview.json();
    assert.strictEqual(dataOverview.data.defaultSectionId, sec10A.id);

    // 2. Load register for assigned Section 10A
    const req10A = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register?sectionId=${sec10A.id}&date=2026-10-22`,
      { token: tokenClassTeacher }
    );
    const res10A = await getRegisterHandler(req10A, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(res10A.status, 200);
    const data10A = await res10A.json();
    assert.strictEqual(data10A.data.permissions.canMark, true);
    // Verify archived student is strictly excluded from active roster
    const studentIds = data10A.data.roster.map((s: { studentId: string }) => s.studentId);
    assert.strictEqual(studentIds.includes(student1.id), true);
    assert.strictEqual(studentIds.includes(student2.id), true);
    assert.strictEqual(studentIds.includes(student3Archived.id), false);

    // 3. Denied for unassigned Section 10B
    const req10B = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register?sectionId=${sec10B.id}&date=2026-10-22`,
      { token: tokenClassTeacher }
    );
    const res10B = await getRegisterHandler(req10B, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(res10B.status, 403);
  });

  // --------------------------------------------------------------------------
  // 3. Subject-only teacher: 403 Forbidden for daily section attendance mutation
  // --------------------------------------------------------------------------
  it("3. Subject-only teacher: denied marking or saving draft (403 Forbidden)", async () => {
    const reqDraft = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/draft`,
      {
        method: "POST",
        token: tokenSubjectTeacher,
        body: {
          sectionId: sec10A.id,
          date: "2026-10-22",
          records: [{ studentId: student1.id, status: "PRESENT" }],
        },
      }
    );
    const resDraft = await postDraftHandler(reqDraft, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resDraft.status, 403);
    const errBody = await resDraft.json();
    assert.strictEqual(errBody.error.code, "forbidden");
  });

  // --------------------------------------------------------------------------
  // 4. Accountant and Inactive user: strictly denied (403 Forbidden / 401 Unauthorized)
  // --------------------------------------------------------------------------
  it("4. Accountant and inactive users: strictly denied from attendance module", async () => {
    // Accountant -> 403
    const reqAcc = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/overview`,
      { token: tokenAccountant }
    );
    const resAcc = await getOverviewHandler(reqAcc, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resAcc.status, 403);

    // Inactive user -> 401 Unauthorized
    const reqInactive = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/overview`,
      { token: tokenInactive }
    );
    const resInactive = await getOverviewHandler(reqInactive, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resInactive.status, 401);
  });

  // --------------------------------------------------------------------------
  // 5. Cross-tenant isolation: cannot access foreign school attendance
  // --------------------------------------------------------------------------
  it("5. Cross-tenant boundary: school admin of School A cannot access foreign school B", async () => {
    const reqForeign = createAuthRequest(
      `http://localhost:3000/api/v1/school/${FOREIGN_SCH_SLUG}/attendance/overview`,
      { token: tokenSchoolAdmin }
    );
    const resForeign = await getOverviewHandler(reqForeign, {
      params: Promise.resolve({ schoolSlug: FOREIGN_SCH_SLUG }),
    });
    assert.strictEqual(resForeign.status, 403);
    const body = await resForeign.json();
    assert.strictEqual(body.error.code, "forbidden");
  });

  // --------------------------------------------------------------------------
  // 6. Draft save: allows partial roster saves in DRAFT state
  // --------------------------------------------------------------------------
  it("6. Draft save: saves partial records and keeps register in DRAFT status", async () => {
    const reqDraft = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/draft`,
      {
        method: "POST",
        token: tokenClassTeacher,
        body: {
          sectionId: sec10A.id,
          date: "2026-10-22",
          records: [
            { studentId: student1.id, status: "PRESENT", remarks: "Punctual" },
            // student2 left unmarked in draft
          ],
        },
      }
    );
    const resDraft = await postDraftHandler(reqDraft, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resDraft.status, 200);

    // Verify DB state
    const regInDb = await prisma.attendanceRegister.findFirst({
      where: {
        schoolId: school.id,
        sectionId: sec10A.id,
        date: new Date(Date.UTC(2026, 9, 22)),
      },
      include: { records: true },
    });
    assert.notStrictEqual(regInDb, null);
    assert.strictEqual(regInDb?.status, "DRAFT");
    assert.strictEqual(regInDb?.records.length, 1);
    assert.strictEqual(regInDb?.records[0].studentId, student1.id);
    assert.strictEqual(regInDb?.records[0].status, "PRESENT");
  });

  // --------------------------------------------------------------------------
  // 7. Submission validation: rejects submission if any enrolled student is unmarked
  // --------------------------------------------------------------------------
  it("7. Submission validation: rejects submit when any eligible student is unmarked", async () => {
    // Only student1 marked, student2 missing -> 422 Validation Error
    const reqIncomplete = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/submit`,
      {
        method: "POST",
        token: tokenClassTeacher,
        body: {
          sectionId: sec10A.id,
          date: "2026-10-22",
          records: [{ studentId: student1.id, status: "PRESENT" }],
        },
      }
    );
    const resIncomplete = await postSubmitHandler(reqIncomplete, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resIncomplete.status, 422);
  });

  // --------------------------------------------------------------------------
  // 8. Successful submission and Register locking
  // --------------------------------------------------------------------------
  it("8. Successful submission: transitions register to SUBMITTED and locks ordinary edits", async () => {
    const reqSubmit = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/submit`,
      {
        method: "POST",
        token: tokenClassTeacher,
        body: {
          sectionId: sec10A.id,
          date: "2026-10-22",
          records: [
            { studentId: student1.id, status: "PRESENT" },
            { studentId: student2.id, status: "ABSENT", remarks: "Sick leave" },
          ],
        },
      }
    );
    const resSubmit = await postSubmitHandler(reqSubmit, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resSubmit.status, 200);

    // Verify DB locked state
    const regInDb = await prisma.attendanceRegister.findFirst({
      where: {
        schoolId: school.id,
        sectionId: sec10A.id,
        date: new Date(Date.UTC(2026, 9, 22)),
      },
      include: { records: true },
    });
    assert.strictEqual(regInDb?.status, "SUBMITTED");
    assert.strictEqual(regInDb?.submittedById, classTeacherUser.id);
    assert.notStrictEqual(regInDb?.submittedAt, null);
    assert.strictEqual(regInDb?.records.length, 2);

    // Locked Invariant: ordinary draft save or repeat submit must fail with ConflictError (409)
    const reqBlockedDraft = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/draft`,
      {
        method: "POST",
        token: tokenClassTeacher,
        body: {
          sectionId: sec10A.id,
          date: "2026-10-22",
          records: [
            { studentId: student1.id, status: "ABSENT" },
            { studentId: student2.id, status: "PRESENT" },
          ],
        },
      }
    );
    const resBlockedDraft = await postDraftHandler(reqBlockedDraft, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resBlockedDraft.status, 409);
  });

  // --------------------------------------------------------------------------
  // 9. Administrative Correction: requires reason, records audit history
  // --------------------------------------------------------------------------
  it("9. Administrative correction: School Admin can correct with mandatory reason; Teacher cannot", async () => {
    const regInDb = await prisma.attendanceRegister.findFirst({
      where: {
        schoolId: school.id,
        sectionId: sec10A.id,
        date: new Date(Date.UTC(2026, 9, 22)),
      },
    });
    assert.notStrictEqual(regInDb, null);

    // 1. Teacher cannot correct submitted register -> 403 Forbidden
    const reqTeacherCorrect = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/correct`,
      {
        method: "POST",
        token: tokenClassTeacher,
        body: {
          registerId: regInDb!.id,
          reason: "Teacher forgot student was excused",
          updates: [{ studentId: student2.id, status: "EXCUSED" }],
        },
      }
    );
    const resTeacherCorrect = await postCorrectHandler(reqTeacherCorrect, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resTeacherCorrect.status, 403);

    // 2. School Admin without reason -> 422 Validation Error
    const reqNoReason = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/correct`,
      {
        method: "POST",
        token: tokenSchoolAdmin,
        body: {
          registerId: regInDb!.id,
          reason: "", // Empty reason
          updates: [{ studentId: student2.id, status: "EXCUSED" }],
        },
      }
    );
    const resNoReason = await postCorrectHandler(reqNoReason, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resNoReason.status, 422);

    // 3. School Admin with valid reason -> 200 Success & Audit Created
    const reqAdminCorrect = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/register/correct`,
      {
        method: "POST",
        token: tokenSchoolAdmin,
        body: {
          registerId: regInDb!.id,
          reason: "Parent submitted medical certificate for excused leave",
          updates: [{ studentId: student2.id, status: "EXCUSED", remarks: "Doctor note" }],
        },
      }
    );
    const resAdminCorrect = await postCorrectHandler(reqAdminCorrect, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resAdminCorrect.status, 200);

    // Verify correction log record
    const correctionLog = await prisma.attendanceCorrection.findFirst({
      where: { registerId: regInDb!.id },
    });
    assert.notStrictEqual(correctionLog, null);
    assert.strictEqual(correctionLog?.previousStatus, "ABSENT");
    assert.strictEqual(correctionLog?.newStatus, "EXCUSED");
    assert.strictEqual(correctionLog?.correctedById, schoolAdminUser.id);
  });

  // --------------------------------------------------------------------------
  // 10. Student enrollment invariant: cannot mark student enrolled in another section
  // --------------------------------------------------------------------------
  it("10. Enrollment invariant: rejects attendance for a student not enrolled in this section", async () => {
    // studentOtherSection is in 10B, not 10A
    await assert.rejects(
      async () => {
        await saveAttendanceDraft(
          school.id,
          {
            id: schoolAdminUser.id,
            role: "SCHOOL_ADMIN",
            schoolId: school.id,
            email: schoolAdminUser.email,
            name: schoolAdminUser.name,
            phone: null,
            isActive: true,
          },
          {
            sectionId: sec10A.id,
            date: "2026-10-23",
            records: [{ studentId: studentOtherSection.id, status: "PRESENT" }],
          }
        );
      },
      (err: unknown) => err instanceof BadRequestError
    );
  });

  // --------------------------------------------------------------------------
  // 11. Transaction rollback on failure: partial failures leave no dirty state
  // --------------------------------------------------------------------------
  it("11. Transaction integrity: invalid student record in batch causes atomic rollback", async () => {
    const testDate = "2026-10-24";
    await assert.rejects(
      async () => {
        await saveAttendanceDraft(
          school.id,
          {
            id: schoolAdminUser.id,
            role: "SCHOOL_ADMIN",
            schoolId: school.id,
            email: schoolAdminUser.email,
            name: schoolAdminUser.name,
            phone: null,
            isActive: true,
          },
          {
            sectionId: sec10A.id,
            date: testDate,
            records: [
              { studentId: student1.id, status: "PRESENT" },
              { studentId: "non-existent-student-id", status: "PRESENT" },
            ],
          }
        );
      },
      (err: unknown) => err instanceof BadRequestError
    );

    // Verify nothing saved for 2026-10-24
    const reg = await prisma.attendanceRegister.findFirst({
      where: {
        schoolId: school.id,
        sectionId: sec10A.id,
        date: new Date(Date.UTC(2026, 9, 24)),
      },
    });
    assert.strictEqual(reg, null);
  });

  // --------------------------------------------------------------------------
  // 12. History & Reports calculations
  // --------------------------------------------------------------------------
  it("12. Attendance reports & calculations: verifies percentages and formulas", async () => {
    // 1. History endpoint
    const reqHistory = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/history?sectionId=${sec10A.id}`,
      { token: tokenSchoolAdmin }
    );
    const resHistory = await getHistoryHandler(reqHistory, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resHistory.status, 200);
    const historyData = await resHistory.json();
    assert.strictEqual(historyData.data.registers.length >= 1, true);

    // 2. Reports endpoint
    const reqReports = createAuthRequest(
      `http://localhost:3000/api/v1/school/${SCH_SLUG}/attendance/reports?sectionId=${sec10A.id}`,
      { token: tokenSchoolAdmin }
    );
    const resReports = await getReportsHandler(reqReports, {
      params: Promise.resolve({ schoolSlug: SCH_SLUG }),
    });
    assert.strictEqual(resReports.status, 200);
    const reportsData = await resReports.json();

    assert.notStrictEqual(reportsData.data.formulaDefinition, undefined);
    assert.strictEqual(
      reportsData.data.formulaDefinition.formula,
      "(Present + Late) / Total Recorded Register Days * 100"
    );

    // Section 10A report check
    const secReport = reportsData.data.sections.find(
      (s: { sectionId: string }) => s.sectionId === sec10A.id
    );
    assert.notStrictEqual(secReport, undefined);
    assert.strictEqual(secReport.submittedRegistersCount, 1);
    // Student 1 is PRESENT, Student 2 is EXCUSED -> Total = 2 entries, Present = 1, Excused = 1
    assert.strictEqual(secReport.presentCount, 1);
    assert.strictEqual(secReport.excusedCount, 1);
    // (1 present + 0 late) / 2 total = 50.0%
    assert.strictEqual(secReport.attendancePercentage, 50);
  });
});
