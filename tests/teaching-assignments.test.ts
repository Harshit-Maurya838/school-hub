import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { hashPassword } from "../src/lib/password.js";
import {
  assignClassTeacher,
  assignSubjectTeacher,
  removeSubjectTeacherAssignment,
  calculateTeacherWorkload,
  getSectionTeachingAssignments,
} from "../src/lib/teaching-assignments.js";
import { assertTeacherAccess } from "../src/lib/rbac.js";
import { POST as assignClassTeacherHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/assignments/class-teacher/route.js";
import { POST as assignSubjectTeacherHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/assignments/subject-teacher/route.js";

interface ErrorWithStatus {
  statusCode: number;
  message: string;
}

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

describe("Teaching Assignments & Faculty Profile Lifecycle", () => {
  const SCHOOL_CODE = "TCH_ASSIGN_01";
  const SCHOOL_SLUG = "tch-assign-school";
  const FOREIGN_CODE = "TCH_ASSIGN_FOR";
  const FOREIGN_SLUG = "tch-foreign-school";

  let school: { id: string; name: string; slug: string };
  let foreignSchool: { id: string; name: string; slug: string };
  let academicYear: { id: string; name: string };
  let foreignYear: { id: string; name: string };

  let grade10: { id: string; name: string };
  let grade9: { id: string; name: string };
  let g10SecA: { id: string; classId: string; name: string };
  let g10SecB: { id: string; classId: string; name: string };
  let g9SecA: { id: string; classId: string; name: string };
  let foreignClass: { id: string; name: string };
  let foreignSection: { id: string; classId: string; name: string };

  let math10Sub: { id: string; name: string };
  let physics10Sub: { id: string; name: string };
  let englishSub: { id: string; name: string };
  let history9Sub: { id: string; name: string };
  let foreignSub: { id: string; name: string };

  let adminUser: { id: string; name: string; email: string | null };
  let teacherUser1: { id: string; name: string; email: string | null };
  let teacherProfile1: { id: string; employeeId: string | null };
  let teacherUser2: { id: string; name: string; email: string | null };
  let teacherProfile2: { id: string; employeeId: string | null };
  let inactiveTeacherUser: { id: string; name: string; email: string | null };
  let inactiveTeacherProfile: { id: string };
  let accountantUser: { id: string; name: string; email: string | null };

  let foreignTeacherUser: { id: string; name: string; email: string | null };
  let foreignTeacherProfile: { id: string };

  let tokenTeacher1: string;
  let tokenAccountant: string;

  before(async () => {
    // 1. Cleanup any previous test data
    await prisma.subjectTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.classTeacherAssignment.deleteMany({
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
            "admin@tch-assign.edu",
            "teacher1@tch-assign.edu",
            "teacher2@tch-assign.edu",
            "inactive@tch-assign.edu",
            "accountant@tch-assign.edu",
            "admin@tch-foreign.edu",
            "teacher@tch-foreign.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } },
    });

    const passwordHash = await hashPassword("Password@123");

    // 2. Setup primary school & foreign school
    school = await prisma.school.create({
      data: {
        name: "Assignment Test Academy",
        code: SCHOOL_CODE,
        slug: SCHOOL_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    foreignSchool = await prisma.school.create({
      data: {
        name: "Foreign Assign Academy",
        code: FOREIGN_CODE,
        slug: FOREIGN_SLUG,
        status: "ACTIVE",
        isActive: true,
      },
    });

    // 3. Academic years
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026-2027",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        isCurrent: true,
      },
    });

    foreignYear = await prisma.academicYear.create({
      data: {
        schoolId: foreignSchool.id,
        name: "2026-2027",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        isCurrent: true,
      },
    });

    // 4. Classes & Sections
    grade10 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 10", numericOrder: 10 },
    });
    grade9 = await prisma.class.create({
      data: { schoolId: school.id, name: "Grade 9", numericOrder: 9 },
    });

    g10SecA = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "A", capacity: 30 },
    });
    g10SecB = await prisma.section.create({
      data: { schoolId: school.id, classId: grade10.id, name: "B", capacity: 30 },
    });
    g9SecA = await prisma.section.create({
      data: { schoolId: school.id, classId: grade9.id, name: "A", capacity: 30 },
    });

    foreignClass = await prisma.class.create({
      data: { schoolId: foreignSchool.id, name: "Foreign Grade 10" },
    });
    foreignSection = await prisma.section.create({
      data: { schoolId: foreignSchool.id, classId: foreignClass.id, name: "A" },
    });

    // 5. Subjects
    math10Sub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Grade 10 Math", code: "MTH-10" },
    });
    physics10Sub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade10.id, name: "Grade 10 Physics", code: "PHY-10" },
    });
    englishSub = await prisma.subject.create({
      data: { schoolId: school.id, classId: null, name: "Core English", code: "ENG-ALL" },
    });
    history9Sub = await prisma.subject.create({
      data: { schoolId: school.id, classId: grade9.id, name: "Grade 9 History", code: "HIS-09" },
    });
    foreignSub = await prisma.subject.create({
      data: { schoolId: foreignSchool.id, classId: foreignClass.id, name: "Foreign Physics" },
    });

    // 6. Users & Teacher Profiles
    adminUser = await prisma.user.create({
      data: {
        name: "Test Admin",
        email: "admin@tch-assign.edu",
        passwordHash,
        role: "SCHOOL_ADMIN",
        schoolId: school.id,
        isActive: true,
      },
    });

    teacherUser1 = await prisma.user.create({
      data: {
        name: "Alice Professor",
        email: "teacher1@tch-assign.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: true,
      },
    });

    teacherProfile1 = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: teacherUser1.id,
        employeeId: "EMP-001",
        qualification: "Ph.D. Math",
        department: "Mathematics",
        designation: "Lead Professor",
        status: "ACTIVE",
      },
    });

    teacherUser2 = await prisma.user.create({
      data: {
        name: "Bob Instructor",
        email: "teacher2@tch-assign.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: true,
      },
    });

    teacherProfile2 = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: teacherUser2.id,
        employeeId: "EMP-002",
        qualification: "M.Sc. Physics",
        department: "Science",
        designation: "Assistant Professor",
        status: "ACTIVE",
      },
    });

    inactiveTeacherUser = await prisma.user.create({
      data: {
        name: "Charlie OnLeave",
        email: "inactive@tch-assign.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: school.id,
        isActive: true,
      },
    });

    inactiveTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: school.id,
        userId: inactiveTeacherUser.id,
        employeeId: "EMP-003",
        status: "ON_LEAVE",
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        name: "Dan Accountant",
        email: "accountant@tch-assign.edu",
        passwordHash,
        role: "ACCOUNTANT",
        schoolId: school.id,
        isActive: true,
      },
    });

    foreignTeacherUser = await prisma.user.create({
      data: {
        name: "Foreign Teacher",
        email: "teacher@tch-foreign.edu",
        passwordHash,
        role: "TEACHER",
        schoolId: foreignSchool.id,
        isActive: true,
      },
    });

    foreignTeacherProfile = await prisma.teacherProfile.create({
      data: {
        schoolId: foreignSchool.id,
        userId: foreignTeacherUser.id,
        employeeId: "FOR-001",
        status: "ACTIVE",
      },
    });

    // 7. Auth tokens
    tokenTeacher1 = await createSessionToken({
      userId: teacherUser1.id,
      schoolId: school.id,
      role: "TEACHER",
      email: teacherUser1.email,
    });

    tokenAccountant = await createSessionToken({
      userId: accountantUser.id,
      schoolId: school.id,
      role: "ACCOUNTANT",
      email: accountantUser.email,
    });
  });

  after(async () => {
    await prisma.subjectTeacherAssignment.deleteMany({
      where: { school: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } } },
    });
    await prisma.classTeacherAssignment.deleteMany({
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
            "admin@tch-assign.edu",
            "teacher1@tch-assign.edu",
            "teacher2@tch-assign.edu",
            "inactive@tch-assign.edu",
            "accountant@tch-assign.edu",
            "admin@tch-foreign.edu",
            "teacher@tch-foreign.edu",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: [SCHOOL_CODE, FOREIGN_CODE] } },
    });
  });

  // =========================================================================
  // Scenario 1: Valid class-teacher assignment
  // =========================================================================
  it("1. valid class-teacher assignment creates active assignment record", async () => {
    const assigned = await assignClassTeacher({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecA.id,
      teacherProfileId: teacherProfile1.id,
      notes: "Grade 10-A Class Teacher",
      actorUserId: adminUser.id,
    });

    assert.ok(assigned.id);
    assert.strictEqual(assigned.status, "ACTIVE");
    assert.strictEqual(assigned.sectionId, g10SecA.id);
    assert.strictEqual(assigned.teacherProfileId, teacherProfile1.id);
    assert.strictEqual(assigned.endDate, null);
    assert.ok(assigned.startDate instanceof Date);
  });

  // =========================================================================
  // Scenario 2: Duplicate class-teacher assignment to same section and year
  // =========================================================================
  it("2. duplicate class-teacher assignment to the same section and academic year is rejected", async () => {
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecA.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 409);
        assert.match(error.message, /already assigned as the active class teacher/);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 3: Reassignment retaining historical records
  // =========================================================================
  it("3. reassigning a class teacher marks the previous assignment as REPLACED and creates a new ACTIVE record", async () => {
    const reassigned = await assignClassTeacher({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecA.id,
      teacherProfileId: teacherProfile2.id,
      notes: "Handed over to Bob",
      actorUserId: adminUser.id,
    });

    assert.strictEqual(reassigned.status, "ACTIVE");
    assert.strictEqual(reassigned.teacherProfileId, teacherProfile2.id);

    // Verify historical record for teacherProfile1
    const previous = await prisma.classTeacherAssignment.findFirst({
      where: {
        schoolId: school.id,
        sectionId: g10SecA.id,
        teacherProfileId: teacherProfile1.id,
      },
    });

    assert.ok(previous);
    assert.strictEqual(previous.status, "REPLACED");
    assert.ok(previous.endDate !== null, "Archived record must have endDate set");

    // Verify active record count for section is exactly 1
    const activeCount = await prisma.classTeacherAssignment.count({
      where: {
        schoolId: school.id,
        sectionId: g10SecA.id,
        academicYearId: academicYear.id,
        status: "ACTIVE",
      },
    });
    assert.strictEqual(activeCount, 1);
  });

  // =========================================================================
  // Scenario 4: Valid subject-teacher assignment
  // =========================================================================
  it("4. valid subject-teacher assignment creates active assignment with periodsPerWeek", async () => {
    const result = await assignSubjectTeacher({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecA.id,
      subjectId: math10Sub.id,
      teacherProfileId: teacherProfile1.id,
      periodsPerWeek: 6,
      actorUserId: adminUser.id,
    });

    assert.ok(result.assignment.id);
    assert.strictEqual(result.assignment.status, "ACTIVE");
    assert.strictEqual(result.assignment.periodsPerWeek, 6);
    assert.strictEqual(result.assignment.subjectId, math10Sub.id);
    assert.strictEqual(result.assignment.teacherProfileId, teacherProfile1.id);
  });

  // =========================================================================
  // Scenario 5: Duplicate subject assignment prevention
  // =========================================================================
  it("5. duplicate subject assignment to the same section and subject is rejected", async () => {
    // Attempt duplicate with same teacher
    await assert.rejects(
      async () => {
        await assignSubjectTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecA.id,
          subjectId: math10Sub.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 409);
        assert.match(error.message, /already actively assigned/);
        return true;
      }
    );

    // Attempt assigning a different teacher to a subject that already has an active teacher
    await assert.rejects(
      async () => {
        await assignSubjectTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecA.id,
          subjectId: math10Sub.id,
          teacherProfileId: teacherProfile2.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 409);
        assert.match(error.message, /already assigned to/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 6: Teacher assigned to multiple subjects and sections
  // =========================================================================
  it("6. teacher can be assigned to multiple subjects and multiple sections concurrently", async () => {
    // Assign teacherProfile1 to Physics in Section A
    const resA = await assignSubjectTeacher({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecA.id,
      subjectId: physics10Sub.id,
      teacherProfileId: teacherProfile1.id,
      periodsPerWeek: 4,
      actorUserId: adminUser.id,
    });
    assert.strictEqual(resA.assignment.status, "ACTIVE");

    // Assign teacherProfile1 to Core English in Section B
    const resB = await assignSubjectTeacher({
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecB.id,
      subjectId: englishSub.id,
      teacherProfileId: teacherProfile1.id,
      periodsPerWeek: 5,
      actorUserId: adminUser.id,
    });
    assert.strictEqual(resB.assignment.status, "ACTIVE");

    // Workload calculation
    const workload = await calculateTeacherWorkload(school.id, teacherProfile1.id, academicYear.id);
    assert.strictEqual(workload.subjectsCount, 3);
    assert.strictEqual(workload.totalPeriodsPerWeek, 15); // 6 + 4 + 5
  });

  // =========================================================================
  // Scenario 7: Rejection of inactive teachers
  // =========================================================================
  it("7. assignment to an inactive teacher profile is rejected", async () => {
    // Class teacher assignment
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          teacherProfileId: inactiveTeacherProfile.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 400);
        assert.match(error.message, /inactive/i);
        return true;
      }
    );

    // Subject teacher assignment
    await assert.rejects(
      async () => {
        await assignSubjectTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          subjectId: physics10Sub.id,
          teacherProfileId: inactiveTeacherProfile.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 400);
        assert.match(error.message, /inactive/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 8: Rejection of cross-school teacher, section, subject, or academic-year IDs
  // =========================================================================
  it("8. cross-school tenant isolation: cross-school IDs are rejected", async () => {
    // Attempting foreign teacher in local school
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          teacherProfileId: foreignTeacherProfile.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    // Attempting foreign section
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: foreignSection.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    // Attempting foreign subject in subject assignment
    await assert.rejects(
      async () => {
        await assignSubjectTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          subjectId: foreignSub.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    // Attempting foreign academic year
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: foreignYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 9: Rejection of section/class mismatch
  // =========================================================================
  it("9. section/class mismatch is rejected", async () => {
    // Section A belongs to Grade 9, but classId passed as Grade 10
    await assert.rejects(
      async () => {
        await assignClassTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g9SecA.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 400);
        assert.match(error.message, /does not belong to/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 10: Invalid subject-to-class assignments
  // =========================================================================
  it("10. invalid subject-to-class assignment is rejected", async () => {
    // history9Sub is specific to Grade 9, cannot be assigned to Grade 10 section
    await assert.rejects(
      async () => {
        await assignSubjectTeacher({
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          subjectId: history9Sub.id,
          teacherProfileId: teacherProfile1.id,
          actorUserId: adminUser.id,
        });
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 400);
        assert.match(error.message, /different class/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Scenario 11: Teacher access limited to permitted records
  // =========================================================================
  it("11. teacher access is limited to their own profile under RBAC", async () => {
    const teacher1AuthUser = {
      id: teacherUser1.id,
      name: teacherUser1.name,
      email: teacherUser1.email,
      phone: null,
      role: "TEACHER" as const,
      schoolId: school.id,
      isActive: true,
      deletedAt: null,
    };

    // Teacher 1 accessing their own profile should succeed
    await assert.doesNotReject(async () => {
      await assertTeacherAccess(teacher1AuthUser, teacherProfile1.id);
    });

    // Teacher 1 accessing Teacher 2's profile should be denied
    await assert.rejects(
      async () => {
        await assertTeacherAccess(teacher1AuthUser, teacherProfile2.id);
      },
      (err: unknown) => {
        const error = err as ErrorWithStatus;
        assert.strictEqual(error.statusCode, 403);
        assert.match(error.message, /teacher can only access their own profile/);
        return true;
      }
    );

    // School admin can access any teacher
    const adminAuthUser = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: null,
      role: "SCHOOL_ADMIN" as const,
      schoolId: school.id,
      isActive: true,
      deletedAt: null,
    };
    await assert.doesNotReject(async () => {
      await assertTeacherAccess(adminAuthUser, teacherProfile1.id);
      await assertTeacherAccess(adminAuthUser, teacherProfile2.id);
    });
  });

  // =========================================================================
  // Scenario 12: Unrelated roles denied assignment mutations
  // =========================================================================
  it("12. non-admin roles (TEACHER, ACCOUNTANT) cannot mutate teaching assignments", async () => {
    // 1. Teacher attempting to mutate class-teacher assignment
    const teacherReq = createAuthRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/academics/assignments/class-teacher`,
      {
        method: "POST",
        token: tokenTeacher1,
        body: {
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          teacherProfileId: teacherProfile1.id,
        },
      }
    );
    const teacherRes = await assignClassTeacherHandler(teacherReq, {
      params: Promise.resolve({ schoolSlug: school.slug }),
    });
    assert.strictEqual(teacherRes.status, 403);

    // 2. Accountant attempting to assign subject teacher
    const accountantReq = createAuthRequest(
      `http://localhost:3000/api/v1/school/${school.slug}/academics/assignments/subject-teacher`,
      {
        method: "POST",
        token: tokenAccountant,
        body: {
          academicYearId: academicYear.id,
          classId: grade10.id,
          sectionId: g10SecB.id,
          subjectId: physics10Sub.id,
          teacherProfileId: teacherProfile1.id,
        },
      }
    );
    const accountantRes = await assignSubjectTeacherHandler(accountantReq, {
      params: Promise.resolve({ schoolSlug: school.slug }),
    });
    assert.strictEqual(accountantRes.status, 403);
  });

  // =========================================================================
  // Scenario 13: Concurrent assignment conflicts handled safely
  // =========================================================================
  it("13. concurrent class-teacher assignments resolve safely without duplicate active records", async () => {
    // Concurrently try assigning teacher 1 and teacher 2 to Section B
    await Promise.allSettled([
      assignClassTeacher({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade10.id,
        sectionId: g10SecB.id,
        teacherProfileId: teacherProfile1.id,
        actorUserId: adminUser.id,
      }),
      assignClassTeacher({
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade10.id,
        sectionId: g10SecB.id,
        teacherProfileId: teacherProfile2.id,
        actorUserId: adminUser.id,
      }),
    ]);

    // Both promises settle, and in the end exactly 1 active class teacher exists for Section B
    const activeAssignments = await prisma.classTeacherAssignment.findMany({
      where: {
        schoolId: school.id,
        sectionId: g10SecB.id,
        academicYearId: academicYear.id,
        status: "ACTIVE",
      },
    });

    assert.strictEqual(
      activeAssignments.length,
      1,
      "There must never be more than one active class teacher per section in an academic year"
    );
  });

  // =========================================================================
  // Scenario 14: Audit events recorded correctly
  // =========================================================================
  it("14. audit logs correctly record all faculty assignment mutations", async () => {
    // Remove a subject teacher assignment to generate SUBJECT_TEACHER_REMOVED audit log
    const existing = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        schoolId: school.id,
        sectionId: g10SecA.id,
        status: "ACTIVE",
      },
    });
    assert.ok(existing);

    await removeSubjectTeacherAssignment({
      schoolId: school.id,
      assignmentId: existing.id,
      actorUserId: adminUser.id,
    });

    // Check audit logs in the school
    const auditLogs = await prisma.auditLog.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "desc" },
    });

    const actions = auditLogs.map((l) => l.action);

    assert.ok(
      actions.includes("CLASS_TEACHER_ASSIGNED"),
      "Audit log must contain CLASS_TEACHER_ASSIGNED"
    );
    assert.ok(
      actions.includes("CLASS_TEACHER_REPLACED"),
      "Audit log must contain CLASS_TEACHER_REPLACED"
    );
    assert.ok(
      actions.includes("SUBJECT_TEACHER_ASSIGNED"),
      "Audit log must contain SUBJECT_TEACHER_ASSIGNED"
    );
    assert.ok(
      actions.includes("SUBJECT_TEACHER_REMOVED"),
      "Audit log must contain SUBJECT_TEACHER_REMOVED"
    );
  });

  // =========================================================================
  // Scenario 15: Section Assignments Directory Query Structure
  // =========================================================================
  it("15. getSectionTeachingAssignments returns correct section, active assignments, and history", async () => {
    const data = await getSectionTeachingAssignments(school.id, academicYear.id, g10SecA.id);

    assert.strictEqual(data.section.id, g10SecA.id);
    assert.strictEqual(data.section.className, "Grade 10");
    assert.ok(data.classTeacher, "Should have active class teacher");
    assert.strictEqual(data.classTeacher.teacherProfileId, teacherProfile2.id);

    // Class teacher history should contain teacher 1
    assert.strictEqual(data.classTeacherHistory.length, 1);
    assert.strictEqual(data.classTeacherHistory[0].status, "REPLACED");

    // Available subjects and teachers
    assert.ok(data.availableSubjects.length >= 3);
    assert.ok(data.availableTeachers.length >= 2);
  });
});
