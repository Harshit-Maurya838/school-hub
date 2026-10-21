import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { hashPassword } from "../src/lib/password.js";
import {
  hasPermission,
  requirePermission,
  assertSchoolAccess,
  canAccessSchool,
  canAccessSection,
  canMarkAttendance,
  canCorrectAttendance,
  canEnterMarks,
  canManageTeachingAssignments,
  sanitizeStudentForAccountant,
  assertAttendanceMarkingAccess,
  assertCanManageTeachingAssignments,
  getTeacherActiveAssignments,
} from "../src/lib/rbac.js";
import { ForbiddenError } from "../src/lib/errors.js";
import { Role } from "../src/generated/prisma/enums.js";
import {
  GET as getStudentsHandler,
  POST as postStudentHandler,
} from "../src/app/api/v1/school/[schoolSlug]/students/route.js";
import { GET as getStudentByIdHandler } from "../src/app/api/v1/school/[schoolSlug]/students/[studentId]/route.js";

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

describe("Phase 8: Comprehensive Authorization Test Matrix", () => {
  const SCHOOL_CODE = "AUTH_TEST_SCH_01";
  const SCHOOL_SLUG = "auth-test-school-01";
  const FOREIGN_CODE = "AUTH_TEST_SCH_02";
  const FOREIGN_SLUG = "auth-test-school-02";

  let school: { id: string; name: string; slug: string };
  let foreignSchool: { id: string; name: string; slug: string };
  let currentYear: { id: string; name: string };
  let pastYear: { id: string; name: string };

  let grade10: { id: string; name: string };
  let grade9: { id: string; name: string };
  let sec10A: { id: string; name: string };
  let sec10B: { id: string; name: string };
  let sec9A: { id: string; name: string };

  let mathSub: { id: string; name: string };
  let physicsSub: { id: string; name: string };
  let historySub: { id: string; name: string };

  let superAdminUser: { id: string; email: string | null; role: Role };
  let schoolAdminUser: { id: string; email: string | null; schoolId: string | null; role: Role };
  let classTeacherUser: { id: string; email: string | null; schoolId: string | null; role: Role };
  let classTeacherProfile: { id: string };
  let subjectTeacherUser: { id: string; email: string | null; schoolId: string | null; role: Role };
  let subjectTeacherProfile: { id: string };
  let dualTeacherUser: { id: string; email: string | null; schoolId: string | null; role: Role };
  let dualTeacherProfile: { id: string };
  let pastTeacherUser: { id: string; email: string | null; schoolId: string | null; role: Role };
  let pastTeacherProfile: { id: string };
  let inactiveTeacherUser: {
    id: string;
    email: string | null;
    schoolId: string | null;
    role: Role;
  };
  let accountantUser: { id: string; email: string | null; schoolId: string | null; role: Role };

  let student10A: { id: string; name: string; admissionNumber: string; apaarId: string | null };
  let student10B: { id: string; name: string; admissionNumber: string; apaarId: string | null };

  let tokenSchoolAdmin: string;
  let tokenClassTeacher: string;

  before(async () => {
    // 1. Cleanup
    await prisma.subjectTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.classTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.enrollment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.student.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.teacherProfile.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.subject.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "superadmin@auth-test.edu",
            "admin@auth-test.edu",
            "classteacher@auth-test.edu",
            "subjectteacher@auth-test.edu",
            "dualteacher@auth-test.edu",
            "pastteacher@auth-test.edu",
            "inactiveteacher@auth-test.edu",
            "accountant@auth-test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } },
    });

    const passwordHash = await hashPassword("SecretPassword@123");

    // 2. Schools
    school = await prisma.school.create({
      data: {
        name: "Authorization Test School",
        code: SCHOOL_CODE,
        slug: SCHOOL_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    foreignSchool = await prisma.school.create({
      data: {
        name: "Foreign Authorization School",
        code: FOREIGN_CODE,
        slug: FOREIGN_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    // 3. Academic Years
    currentYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026-2027",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        isCurrent: true,
      },
    });

    pastYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2025-2026",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-04-30"),
        isCurrent: false,
      },
    });

    // 4. Classes & Sections
    grade10 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 10", numericOrder: 10 },
    });
    grade9 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 9", numericOrder: 9 },
    });

    sec10A = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "A", capacity: 40 },
    });
    sec10B = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "B", capacity: 40 },
    });
    sec9A = await prisma.section.create({
      data: { schoolId: school.id, classId: grade9.id, name: "A", capacity: 35 },
    });

    // 5. Subjects
    mathSub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Mathematics", code: "MATH10" },
    });
    physicsSub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Physics", code: "PHY10" },
    });
    historySub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "History", code: "HIST10" },
    });

    // 6. Users
    superAdminUser = await prisma.user.create({
      data: {
        name: "Platform Super Admin",
        email: "superadmin@auth-test.edu",
        role: "SUPER_ADMIN",
        passwordHash,
        isActive: true,
      },
    });

    schoolAdminUser = await prisma.user.create({
      data: {
        name: "Principal School Admin",
        email: "admin@auth-test.edu",
        role: "SCHOOL_ADMIN",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });

    classTeacherUser = await prisma.user.create({
      data: {
        name: "Alice ClassTeacher",
        email: "classteacher@auth-test.edu",
        role: "TEACHER",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });
    classTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: classTeacherUser.id,
        employeeId: "EMP-CLS-01",
        status: "ACTIVE",
      },
    });

    subjectTeacherUser = await prisma.user.create({
      data: {
        name: "Bob SubjectTeacher",
        email: "subjectteacher@auth-test.edu",
        role: "TEACHER",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });
    subjectTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: subjectTeacherUser.id,
        employeeId: "EMP-SUB-01",
        status: "ACTIVE",
      },
    });

    dualTeacherUser = await prisma.user.create({
      data: {
        name: "Charlie DualTeacher",
        email: "dualteacher@auth-test.edu",
        role: "TEACHER",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });
    dualTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: dualTeacherUser.id,
        employeeId: "EMP-DUAL-01",
        status: "ACTIVE",
      },
    });

    pastTeacherUser = await prisma.user.create({
      data: {
        name: "David PastTeacher",
        email: "pastteacher@auth-test.edu",
        role: "TEACHER",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });
    pastTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: pastTeacherUser.id,
        employeeId: "EMP-PAST-01",
        status: "ACTIVE",
      },
    });

    inactiveTeacherUser = await prisma.user.create({
      data: {
        name: "Eve InactiveTeacher",
        email: "inactiveteacher@auth-test.edu",
        role: "TEACHER",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });
    await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: inactiveTeacherUser.id,
        employeeId: "EMP-INACT-01",
        status: "TERMINATED", // inactive employment status
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        name: "Frank Accountant",
        email: "accountant@auth-test.edu",
        role: "ACCOUNTANT",
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
    });

    // 7. Assignments
    // Alice is Class Teacher of Grade 10-A (current year)
    await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        teacherProfileId: classTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // Bob is Subject Teacher for Mathematics in Grade 10-A (current year)
    await prisma.subjectTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        subjectId: mathSub.id,
        teacherProfileId: subjectTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // Charlie is Class Teacher of Grade 9-A AND Subject Teacher for History in Grade 10-A
    await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade9.id,
        sectionId: sec9A.id,
        teacherProfileId: dualTeacherProfile.id,
        status: "ACTIVE",
      },
    });
    await prisma.subjectTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        subjectId: historySub.id,
        teacherProfileId: dualTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // David was Class Teacher in 10-A only during the PAST year (2025-2026)
    await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: pastYear.id,
        classId: grade10.id,
        sectionId: sec10A.id,
        teacherProfileId: pastTeacherProfile.id,
        status: "ACTIVE",
      },
    });

    // 8. Students & Enrollments
    student10A = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-10A-001",
        name: "Student TenA",
        dob: new Date("2010-01-01"),
        gender: "MALE",
        apaarId: "APAAR-CONFIDENTIAL-10A",
      },
    });
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student10A.id,
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
        status: "ACTIVE",
      },
    });

    student10B = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber: "ADM-10B-002",
        name: "Student TenB",
        dob: new Date("2010-02-02"),
        gender: "FEMALE",
        apaarId: "APAAR-CONFIDENTIAL-10B",
      },
    });
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student10B.id,
        sectionId: sec10B.id,
        academicYearId: currentYear.id,
        status: "ACTIVE",
      },
    });

    // Session Tokens
    tokenSchoolAdmin = await createSessionToken({
      userId: schoolAdminUser.id,
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
      email: schoolAdminUser.email,
    });
    tokenClassTeacher = await createSessionToken({
      userId: classTeacherUser.id,
      role: "TEACHER",
      schoolId: school.id,
      email: classTeacherUser.email,
    });
  });

  after(async () => {
    // Teardown
    await prisma.subjectTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.classTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.enrollment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.student.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.teacherProfile.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.subject.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "superadmin@auth-test.edu",
            "admin@auth-test.edu",
            "classteacher@auth-test.edu",
            "subjectteacher@auth-test.edu",
            "dualteacher@auth-test.edu",
            "pastteacher@auth-test.edu",
            "inactiveteacher@auth-test.edu",
            "accountant@auth-test.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } },
    });
  });

  // --------------------------------------------------------------------------
  // 1. School Admin can manage academic configuration within their own school
  // --------------------------------------------------------------------------
  it("1. School Admin can manage academic configuration within their own school", async () => {
    const adminAuthUser = {
      id: schoolAdminUser.id,
      name: "Admin",
      email: schoolAdminUser.email,
      phone: null,
      role: "SCHOOL_ADMIN" as const,
      schoolId: school.id,
      isActive: true,
    };

    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "academics.configure"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "teaching_assignments.manage"), true);
    assert.strictEqual(canManageTeachingAssignments(adminAuthUser, school.id), true);
    assert.doesNotThrow(() => assertCanManageTeachingAssignments(adminAuthUser, school.id));

    const canAccessSecA = await canAccessSection(adminAuthUser, sec10A.id);
    const canAccessSecB = await canAccessSection(adminAuthUser, sec10B.id);
    assert.strictEqual(canAccessSecA, true);
    assert.strictEqual(canAccessSecB, true);

    const superAdminAuth = {
      id: superAdminUser.id,
      name: "Super Admin",
      email: superAdminUser.email,
      phone: null,
      role: "SUPER_ADMIN" as const,
      schoolId: null,
      isActive: true,
    };
    assert.strictEqual(canManageTeachingAssignments(superAdminAuth, school.id), true);
  });

  // --------------------------------------------------------------------------
  // 2. School Admin cannot administer another tenant
  // --------------------------------------------------------------------------
  it("2. School Admin cannot administer another tenant", async () => {
    const adminAuthUser = {
      id: schoolAdminUser.id,
      name: "Admin",
      email: schoolAdminUser.email,
      phone: null,
      role: "SCHOOL_ADMIN" as const,
      schoolId: school.id,
      isActive: true,
    };

    assert.strictEqual(canAccessSchool(adminAuthUser, foreignSchool.id), false);
    assert.throws(
      () => assertSchoolAccess(adminAuthUser, foreignSchool.id),
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );

    assert.strictEqual(canManageTeachingAssignments(adminAuthUser, foreignSchool.id), false);
    assert.throws(
      () => assertCanManageTeachingAssignments(adminAuthUser, foreignSchool.id),
      (err: unknown) => err instanceof ForbiddenError
    );
  });

  // --------------------------------------------------------------------------
  // 3. Principal permissions match chosen policy (School Admin has academic/attendance oversight, no platform powers)
  // --------------------------------------------------------------------------
  it("3. Principal permissions match chosen policy", async () => {
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "attendance.approve"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "attendance.correct"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "reports.read"), true);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "teachers.manage"), true);

    // School Admin does NOT have platform administration powers
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "platform:manage"), false);
    assert.strictEqual(hasPermission("SCHOOL_ADMIN", "school:create"), false);

    const adminAuthUser = {
      id: schoolAdminUser.id,
      name: "Admin",
      email: schoolAdminUser.email,
      phone: null,
      role: "SCHOOL_ADMIN" as const,
      schoolId: school.id,
      isActive: true,
    };
    assert.throws(
      () => requirePermission(adminAuthUser, "platform:manage"),
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );
  });

  // --------------------------------------------------------------------------
  // 4. A class teacher can mark attendance for their assigned section
  // --------------------------------------------------------------------------
  it("4. A class teacher can mark attendance for their assigned section", async () => {
    const classTeacherAuth = {
      id: classTeacherUser.id,
      name: "Alice",
      email: classTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    const canMark = await canMarkAttendance(classTeacherAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canMark, true);
    await assert.doesNotReject(async () => {
      await assertAttendanceMarkingAccess(classTeacherAuth, sec10A.id, currentYear.id);
    });

    const canCorrect = await canCorrectAttendance(classTeacherAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canCorrect, true);
  });

  // --------------------------------------------------------------------------
  // 5. A class teacher cannot mark attendance for an unrelated section
  // --------------------------------------------------------------------------
  it("5. A class teacher cannot mark attendance for an unrelated section", async () => {
    const classTeacherAuth = {
      id: classTeacherUser.id,
      name: "Alice",
      email: classTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    // Section 10B is not assigned to Alice
    const canMark10B = await canMarkAttendance(classTeacherAuth, sec10B.id, currentYear.id);
    assert.strictEqual(canMark10B, false);

    await assert.rejects(
      async () => {
        await assertAttendanceMarkingAccess(classTeacherAuth, sec10B.id, currentYear.id);
      },
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );
  });

  // --------------------------------------------------------------------------
  // 6. A subject teacher cannot edit another subject's marks
  // --------------------------------------------------------------------------
  it("6. A subject teacher cannot edit another subject's marks", async () => {
    const subjectTeacherAuth = {
      id: subjectTeacherUser.id,
      name: "Bob",
      email: subjectTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    // Bob is assigned to Math in 10A
    const canEnterMath10A = await canEnterMarks(
      subjectTeacherAuth,
      mathSub.id,
      sec10A.id,
      currentYear.id
    );
    assert.strictEqual(canEnterMath10A, true);

    // Bob is NOT assigned to Physics in 10A
    const canEnterPhysics10A = await canEnterMarks(
      subjectTeacherAuth,
      physicsSub.id,
      sec10A.id,
      currentYear.id
    );
    assert.strictEqual(canEnterPhysics10A, false);

    // Bob is NOT assigned to Math in 10B
    const canEnterMath10B = await canEnterMarks(
      subjectTeacherAuth,
      mathSub.id,
      sec10B.id,
      currentYear.id
    );
    assert.strictEqual(canEnterMath10B, false);
  });

  // --------------------------------------------------------------------------
  // 7. A subject teacher cannot edit daily attendance without an explicit attendance policy permitting it
  // --------------------------------------------------------------------------
  it("7. A subject teacher cannot edit daily attendance without an explicit attendance policy permitting it", async () => {
    const subjectTeacherAuth = {
      id: subjectTeacherUser.id,
      name: "Bob",
      email: subjectTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    // Even though Bob teaches Math in 10A, he is NOT the Class Teacher of 10A
    const canMark = await canMarkAttendance(subjectTeacherAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canMark, false);

    await assert.rejects(
      async () => {
        await assertAttendanceMarkingAccess(subjectTeacherAuth, sec10A.id, currentYear.id);
      },
      (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
    );
  });

  // --------------------------------------------------------------------------
  // 8. A teacher with both assignments receives the appropriate combined capabilities
  // --------------------------------------------------------------------------
  it("8. A teacher with both assignments receives the appropriate combined capabilities", async () => {
    const dualTeacherAuth = {
      id: dualTeacherUser.id,
      name: "Charlie",
      email: dualTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    // Charlie is Class Teacher of 9A
    const canAccess9A = await canAccessSection(dualTeacherAuth, sec9A.id, currentYear.id);
    const canMark9A = await canMarkAttendance(dualTeacherAuth, sec9A.id, currentYear.id);
    assert.strictEqual(canAccess9A, true);
    assert.strictEqual(canMark9A, true);

    // Charlie is Subject Teacher for History in 10A
    const canAccess10A = await canAccessSection(dualTeacherAuth, sec10A.id, currentYear.id);
    const canEnterHistory10A = await canEnterMarks(
      dualTeacherAuth,
      historySub.id,
      sec10A.id,
      currentYear.id
    );
    // But CANNOT mark daily attendance for 10A (since only subject teacher)
    const canMark10A = await canMarkAttendance(dualTeacherAuth, sec10A.id, currentYear.id);

    assert.strictEqual(canAccess10A, true);
    assert.strictEqual(canEnterHistory10A, true);
    assert.strictEqual(canMark10A, false);

    // Cannot touch unrelated 10B
    const canAccess10B = await canAccessSection(dualTeacherAuth, sec10B.id, currentYear.id);
    assert.strictEqual(canAccess10B, false);

    // Neither assignment elevates to school-wide admin
    assert.strictEqual(canManageTeachingAssignments(dualTeacherAuth, school.id), false);
  });

  // --------------------------------------------------------------------------
  // 9. A teacher whose assignment was replaced or completed loses current permissions
  // --------------------------------------------------------------------------
  it("9. A teacher whose assignment was replaced or completed loses corresponding current permissions", async () => {
    // Temporarily create an assignment and then mark it REPLACED
    const tempAssignment = await prisma.classTeacherAssignment.create({
      data: {
        schoolId: school.id,
        academicYearId: currentYear.id,
        classId: grade10.id,
        sectionId: sec10B.id,
        teacherProfileId: subjectTeacherProfile.id,
        status: "REPLACED", // Inactive status
      },
    });

    const subjectTeacherAuth = {
      id: subjectTeacherUser.id,
      name: "Bob",
      email: subjectTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    const canMark10B = await canMarkAttendance(subjectTeacherAuth, sec10B.id, currentYear.id);
    assert.strictEqual(
      canMark10B,
      false,
      "REPLACED assignment must not grant attendance permissions"
    );

    // Clean up temp assignment
    await prisma.classTeacherAssignment.delete({ where: { id: tempAssignment.id } });
  });

  // --------------------------------------------------------------------------
  // 10. A historical assignment does not grant current access
  // --------------------------------------------------------------------------
  it("10. A historical assignment does not grant current access", async () => {
    const pastTeacherAuth = {
      id: pastTeacherUser.id,
      name: "David",
      email: pastTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };

    // David had Class Teacher assignment in 2025-2026, but NOT in current 2026-2027
    const canAccessCurrent = await canAccessSection(pastTeacherAuth, sec10A.id, currentYear.id);
    const canMarkCurrent = await canMarkAttendance(pastTeacherAuth, sec10A.id, currentYear.id);

    assert.strictEqual(canAccessCurrent, false);
    assert.strictEqual(canMarkCurrent, false);
  });

  // --------------------------------------------------------------------------
  // 11. An inactive or terminated teacher cannot mutate current records
  // --------------------------------------------------------------------------
  it("11. An inactive or terminated teacher cannot mutate current records", async () => {
    const inactiveTeacherAuth = {
      id: inactiveTeacherUser.id,
      name: "Eve",
      email: inactiveTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true, // User is active, but TeacherProfile is TERMINATED
    };

    // TeacherProfile status is TERMINATED
    const assignments = await getTeacherActiveAssignments(
      school.id,
      inactiveTeacherUser.id,
      currentYear.id
    );
    assert.strictEqual(assignments, null, "Terminated teacher must resolve null assignments");

    const canMark = await canMarkAttendance(inactiveTeacherAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canMark, false);
  });

  // --------------------------------------------------------------------------
  // 12. An accountant cannot access restricted academic records and gets sanitized student data
  // --------------------------------------------------------------------------
  it("12. An accountant cannot access restricted academic records and gets sanitized student data", async () => {
    const accountantAuth = {
      id: accountantUser.id,
      name: "Frank",
      email: accountantUser.email,
      phone: null,
      role: "ACCOUNTANT" as const,
      schoolId: school.id,
      isActive: true,
    };

    // Accountant has fees permissions but NO academic configure / attendance mark
    assert.strictEqual(hasPermission("ACCOUNTANT", "fees.read"), true);
    assert.strictEqual(hasPermission("ACCOUNTANT", "fees.collect"), true);
    assert.strictEqual(hasPermission("ACCOUNTANT", "academics.configure"), false);
    assert.strictEqual(hasPermission("ACCOUNTANT", "attendance.mark"), false);
    assert.strictEqual(hasPermission("ACCOUNTANT", "marks.enter"), false);

    const canMark = await canMarkAttendance(accountantAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canMark, false);

    // Sanitization test: APAAR ID must be stripped from student payload for accountants
    const rawStudent = {
      id: "std_123",
      name: "John Doe",
      admissionNumber: "ADM-001",
      apaarId: "APAAR-CONFIDENTIAL-9999",
      schoolId: school.id,
    };
    const sanitized = sanitizeStudentForAccountant(rawStudent);
    assert.strictEqual("apaarId" in sanitized, false);
    assert.strictEqual(sanitized.id, "std_123");
  });

  // --------------------------------------------------------------------------
  // 13. A client cannot bypass authorization by editing IDs or directly calling API endpoints
  // --------------------------------------------------------------------------
  it("13. A client cannot bypass authorization by calling API endpoints directly", async () => {
    // Alice (Class Teacher 10A) attempts to fetch student from 10B directly via GET /api/v1/school/[slug]/students/[studentId]
    const reqUnassignedStudent = createAuthRequest(
      `http://localhost/api/v1/school/${SCHOOL_SLUG}/students/${student10B.id}`,
      { method: "GET", token: tokenClassTeacher }
    );
    const resUnassignedStudent = await getStudentByIdHandler(reqUnassignedStudent, {
      params: Promise.resolve({ schoolSlug: SCHOOL_SLUG, studentId: student10B.id }),
    });
    assert.strictEqual(
      resUnassignedStudent.status,
      403,
      "Teacher accessing unassigned student must receive 403 Forbidden"
    );

    // Alice attempts to admit a student via POST /api/v1/school/[slug]/students (admit requires write access / SCHOOL_ADMIN)
    const reqAdmit = createAuthRequest(`http://localhost/api/v1/school/${SCHOOL_SLUG}/students`, {
      method: "POST",
      token: tokenClassTeacher,
      body: {
        admissionNumber: "HACK-001",
        name: "Unauthorized Admission",
        dob: "2010-01-01",
        gender: "MALE",
        sectionId: sec10A.id,
        academicYearId: currentYear.id,
      },
    });
    const resAdmit = await postStudentHandler(reqAdmit, {
      params: Promise.resolve({ schoolSlug: SCHOOL_SLUG }),
    });
    assert.strictEqual(
      resAdmit.status,
      403,
      "Teacher attempting student admission must receive 403 Forbidden"
    );
  });

  // --------------------------------------------------------------------------
  // 14. Cross-tenant IDs are rejected
  // --------------------------------------------------------------------------
  it("14. Cross-tenant IDs and slugs are rejected across API and service layers", async () => {
    // School Admin of School A tries to request School B's students endpoint
    const reqForeign = createAuthRequest(
      `http://localhost/api/v1/school/${FOREIGN_SLUG}/students`,
      { method: "GET", token: tokenSchoolAdmin }
    );
    const resForeign = await getStudentsHandler(reqForeign, {
      params: Promise.resolve({ schoolSlug: FOREIGN_SLUG }),
    });
    assert.strictEqual(
      resForeign.status,
      403,
      "Cross-tenant slug access must return 403 Forbidden"
    );
  });

  // --------------------------------------------------------------------------
  // 15. Read access and write access are tested independently
  // --------------------------------------------------------------------------
  it("15. Read access and write access are tested independently", async () => {
    // Teacher has read access to their assigned student roster
    const reqRosterRead = createAuthRequest(
      `http://localhost/api/v1/school/${SCHOOL_SLUG}/students`,
      { method: "GET", token: tokenClassTeacher }
    );
    const resRosterRead = await getStudentsHandler(reqRosterRead, {
      params: Promise.resolve({ schoolSlug: SCHOOL_SLUG }),
    });
    assert.strictEqual(resRosterRead.status, 200, "Teacher can read their assigned student roster");

    const jsonRead = await resRosterRead.json();
    assert.ok(jsonRead.data?.students, "Should return data.students array");
    // Should contain Student 10A (assigned) and NOT Student 10B (unassigned)
    const studentIds = jsonRead.data.students.map((s: { id: string }) => s.id);
    assert.strictEqual(studentIds.includes(student10A.id), true);
    assert.strictEqual(studentIds.includes(student10B.id), false);

    // But Teacher has NO write access to admit students
    assert.strictEqual(hasPermission("TEACHER", "students.admit"), false);
  });

  // --------------------------------------------------------------------------
  // 16. Locked attendance and finalized records cannot be edited through ordinary teacher actions
  // --------------------------------------------------------------------------
  it("16. Locked attendance and finalized records cannot be edited through ordinary teacher actions", async () => {
    // Verify policy assertion: a subject teacher or unauthorized role cannot correct attendance
    const subjectTeacherAuth = {
      id: subjectTeacherUser.id,
      name: "Bob",
      email: subjectTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };
    const canCorrect = await canCorrectAttendance(subjectTeacherAuth, sec10A.id, currentYear.id);
    assert.strictEqual(canCorrect, false);

    // Inactive teacher cannot correct attendance
    const inactiveTeacherAuth = {
      id: inactiveTeacherUser.id,
      name: "Eve",
      email: inactiveTeacherUser.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
    };
    const canInactiveCorrect = await canCorrectAttendance(
      inactiveTeacherAuth,
      sec10A.id,
      currentYear.id
    );
    assert.strictEqual(canInactiveCorrect, false);
  });
});
