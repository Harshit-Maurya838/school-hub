import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function seed() {
  console.log("\n========================================================");
  console.log("🧹 1. Resetting Database (Wiping existing data)...");
  console.log("========================================================");

  // Truncate all tables in proper cascade order
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "audit_logs",
      "invitations",
      "school_registrations",
      "subject_teacher_assignments",
      "class_teacher_assignments",
      "teacher_profiles",
      "enrollments",
      "student_guardians",
      "students",
      "guardians",
      "subjects",
      "sections",
      "classes",
      "academic_years",
      "users",
      "schools"
    CASCADE;
  `);

  console.log("   ✅ Database tables cleared successfully.");

  const defaultPassword = "Password@123";
  const passwordHash = await hashPassword(defaultPassword);

  console.log("\n========================================================");
  console.log("👑 2. Creating Platform Super Administrator...");
  console.log("========================================================");

  const superAdmin = await prisma.user.create({
    data: {
      name: "Platform Super Administrator",
      email: "superadmin@platform.local",
      passwordHash,
      role: "SUPER_ADMIN",
      schoolId: null,
      isActive: true,
    },
  });
  console.log(`   ✅ Super Admin: ${superAdmin.email} (Role: ${superAdmin.role})`);

  console.log("\n========================================================");
  console.log("🏫 3. Creating Established School (Greenwood High Academy)...");
  console.log("========================================================");

  const school = await prisma.school.create({
    data: {
      name: "Greenwood High Academy",
      code: "GWD_001",
      slug: "greenwood-high",
      status: "ACTIVE",
      isActive: true,
    },
  });
  console.log(`   ✅ School created: ${school.name} (Slug: ${school.slug})`);

  // Staff accounts for Greenwood High
  const schoolAdmin = await prisma.user.create({
    data: {
      name: "Eleanor Vance",
      email: "admin@greenwood.local",
      passwordHash,
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
      isActive: true,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: "Marcus Aurelius",
      email: "teacher@greenwood.local",
      passwordHash,
      role: "TEACHER",
      schoolId: school.id,
      isActive: true,
    },
  });

  const teacherProfile = await prisma.teacherProfile.create({
    data: {
      schoolId: school.id,
      userId: teacher.id,
      employeeId: "TCH-001",
      qualification: "M.Sc. Mathematics, B.Ed.",
      specialization: "Pure Mathematics & Statistics",
      department: "Mathematics",
      designation: "Senior Mathematics Faculty",
      joiningDate: new Date("2022-08-15"),
      status: "ACTIVE",
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "teacher2@greenwood.local",
      passwordHash,
      role: "TEACHER",
      schoolId: school.id,
      isActive: true,
    },
  });

  const teacher2Profile = await prisma.teacherProfile.create({
    data: {
      schoolId: school.id,
      userId: teacher2.id,
      employeeId: "TCH-002",
      qualification: "M.Sc. Physics, Ph.D.",
      specialization: "Quantum Mechanics & Optics",
      department: "Science",
      designation: "Head of Science Department",
      joiningDate: new Date("2021-06-01"),
      status: "ACTIVE",
    },
  });

  const accountant = await prisma.user.create({
    data: {
      name: "Rachel Green",
      email: "accountant@greenwood.local",
      passwordHash,
      role: "ACCOUNTANT",
      schoolId: school.id,
      isActive: true,
    },
  });

  console.log(`   ✅ School Admin: ${schoolAdmin.email}`);
  console.log(
    `   ✅ Teachers:     ${teacher.email} (${teacherProfile.employeeId}), ${teacher2.email} (${teacher2Profile.employeeId})`
  );
  console.log(`   ✅ Accountant:   ${accountant.email}`);

  // Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2026-2027",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2027-04-30T23:59:59.999Z"),
      isCurrent: true,
    },
  });
  console.log(`   ✅ Active Academic Year: ${academicYear.name}`);

  // Classes
  const grade10 = await prisma.class.create({
    data: {
      schoolId: school.id,
      name: "Grade 10",
      numericOrder: 10,
    },
  });

  const grade9 = await prisma.class.create({
    data: {
      schoolId: school.id,
      name: "Grade 9",
      numericOrder: 9,
    },
  });

  const grade8 = await prisma.class.create({
    data: {
      schoolId: school.id,
      name: "Grade 8",
      numericOrder: 8,
    },
  });
  console.log("   ✅ Classes created: Grade 10, Grade 9, Grade 8");

  // Sections
  const g10SecA = await prisma.section.create({
    data: { schoolId: school.id, classId: grade10.id, name: "Section A", capacity: 30 },
  });
  const g10SecB = await prisma.section.create({
    data: { schoolId: school.id, classId: grade10.id, name: "Section B", capacity: 30 },
  });

  const g9SecA = await prisma.section.create({
    data: { schoolId: school.id, classId: grade9.id, name: "Section A", capacity: 30 },
  });
  const g9SecB = await prisma.section.create({
    data: { schoolId: school.id, classId: grade9.id, name: "Section B", capacity: 30 },
  });

  const g8SecA = await prisma.section.create({
    data: { schoolId: school.id, classId: grade8.id, name: "Section A", capacity: 30 },
  });
  console.log("   ✅ Sections created across Grade 10, 9, and 8");

  // Subjects
  const math10 = await prisma.subject.create({
    data: { schoolId: school.id, classId: grade10.id, name: "Mathematics", code: "MATH-10" },
  });
  const physics10 = await prisma.subject.create({
    data: { schoolId: school.id, classId: grade10.id, name: "Advanced Physics", code: "PHY-10" },
  });
  const chem10 = await prisma.subject.create({
    data: { schoolId: school.id, classId: grade10.id, name: "Organic Chemistry", code: "CHEM-10" },
  });
  await prisma.subject.create({
    data: { schoolId: school.id, classId: grade9.id, name: "English Literature", code: "ENG-09" },
  });
  await prisma.subject.create({
    data: { schoolId: school.id, classId: grade9.id, name: "Computer Science", code: "CS-09" },
  });
  await prisma.subject.createMany({
    data: [
      { schoolId: school.id, classId: grade8.id, name: "General Science", code: "SCI-08" },
      { schoolId: school.id, classId: grade8.id, name: "World History", code: "HIST-08" },
    ],
  });
  console.log("   ✅ Curriculum Subjects cataloged");

  // Guardians
  const guardians = await Promise.all([
    prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "John Smith",
        phone: "+1 555-0101",
        email: "john.smith@parent.local",
        occupation: "Software Architect",
        address: "742 Evergreen Terrace",
      },
    }),
    prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "Mary Johnson",
        phone: "+1 555-0102",
        email: "mary.j@parent.local",
        occupation: "Pediatrician",
        address: "123 Elm Street",
      },
    }),
    prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "Robert Davis",
        phone: "+1 555-0103",
        email: "robert.d@parent.local",
        occupation: "Civil Engineer",
        address: "456 Oak Avenue",
      },
    }),
    prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "Sarah Wilson",
        phone: "+1 555-0104",
        email: "sarah.w@parent.local",
        occupation: "Financial Analyst",
        address: "89 Pine Boulevard",
      },
    }),
    prisma.guardian.create({
      data: {
        schoolId: school.id,
        name: "David Miller",
        phone: "+1 555-0105",
        email: "david.m@parent.local",
        occupation: "Professor",
        address: "321 Maple Lane",
      },
    }),
  ]);
  console.log(`   ✅ Guardians created: ${guardians.length} parents`);

  // Students & Enrollments
  const mockStudents = [
    {
      name: "Liam Johnson",
      admissionNumber: "GWD-2026-001",
      gender: "MALE" as const,
      dob: new Date("2011-04-12"),
      sectionId: g10SecA.id,
      rollNumber: "101",
      guardianIdx: 1,
    },
    {
      name: "Emma Smith",
      admissionNumber: "GWD-2026-002",
      gender: "FEMALE" as const,
      dob: new Date("2011-08-23"),
      sectionId: g10SecA.id,
      rollNumber: "102",
      guardianIdx: 0,
    },
    {
      name: "Noah Davis",
      admissionNumber: "GWD-2026-003",
      gender: "MALE" as const,
      dob: new Date("2011-02-17"),
      sectionId: g10SecB.id,
      rollNumber: "103",
      guardianIdx: 2,
    },
    {
      name: "Olivia Wilson",
      admissionNumber: "GWD-2026-004",
      gender: "FEMALE" as const,
      dob: new Date("2011-11-05"),
      sectionId: g10SecB.id,
      rollNumber: "104",
      guardianIdx: 3,
    },
    {
      name: "James Miller",
      admissionNumber: "GWD-2026-005",
      gender: "MALE" as const,
      dob: new Date("2012-06-19"),
      sectionId: g9SecA.id,
      rollNumber: "201",
      guardianIdx: 4,
    },
    {
      name: "Sophia Brown",
      admissionNumber: "GWD-2026-006",
      gender: "FEMALE" as const,
      dob: new Date("2012-09-14"),
      sectionId: g9SecA.id,
      rollNumber: "202",
      guardianIdx: 1,
    },
    {
      name: "Benjamin Taylor",
      admissionNumber: "GWD-2026-007",
      gender: "MALE" as const,
      dob: new Date("2012-01-30"),
      sectionId: g9SecB.id,
      rollNumber: "203",
      guardianIdx: 0,
    },
    {
      name: "Ava Anderson",
      admissionNumber: "GWD-2026-008",
      gender: "FEMALE" as const,
      dob: new Date("2012-12-08"),
      sectionId: g9SecB.id,
      rollNumber: "204",
      guardianIdx: 2,
    },
    {
      name: "Lucas Martinez",
      admissionNumber: "GWD-2026-009",
      gender: "MALE" as const,
      dob: new Date("2013-05-15"),
      sectionId: g8SecA.id,
      rollNumber: "301",
      guardianIdx: 3,
    },
    {
      name: "Mia Thomas",
      admissionNumber: "GWD-2026-010",
      gender: "FEMALE" as const,
      dob: new Date("2013-03-22"),
      sectionId: g8SecA.id,
      rollNumber: "302",
      guardianIdx: 4,
    },
    {
      name: "Ethan White",
      admissionNumber: "GWD-2026-011",
      gender: "MALE" as const,
      dob: new Date("2011-10-10"),
      sectionId: g10SecA.id,
      rollNumber: "105",
      guardianIdx: 0,
    },
    {
      name: "Isabella Harris",
      admissionNumber: "GWD-2026-012",
      gender: "FEMALE" as const,
      dob: new Date("2012-07-07"),
      sectionId: g9SecA.id,
      rollNumber: "205",
      guardianIdx: 1,
    },
  ];

  for (const s of mockStudents) {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        name: s.name,
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        dob: s.dob,
        isActive: true,
      },
    });

    // Link Guardian
    await prisma.studentGuardian.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        guardianId: guardians[s.guardianIdx].id,
        relationship: s.guardianIdx % 2 === 0 ? "FATHER" : "MOTHER",
        isPrimary: true,
      },
    });

    // Enroll in active session & section
    await prisma.enrollment.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        sectionId: s.sectionId,
        academicYearId: academicYear.id,
        rollNumber: s.rollNumber,
        status: "ACTIVE",
      },
    });
  }
  console.log(`   ✅ Admitted & Enrolled ${mockStudents.length} Students with Guardians`);

  // Teaching Assignments
  await prisma.classTeacherAssignment.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade10.id,
      sectionId: g10SecA.id,
      teacherProfileId: teacherProfile.id,
      status: "ACTIVE",
      startDate: new Date("2026-06-01"),
      notes: "Grade 10 Section A Class Teacher & Mentor",
    },
  });

  await prisma.classTeacherAssignment.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: grade9.id,
      sectionId: g9SecA.id,
      teacherProfileId: teacher2Profile.id,
      status: "ACTIVE",
      startDate: new Date("2026-06-01"),
      notes: "Grade 9 Section A Class Teacher & Mentor",
    },
  });

  await prisma.subjectTeacherAssignment.createMany({
    data: [
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade10.id,
        sectionId: g10SecA.id,
        subjectId: math10.id,
        teacherProfileId: teacherProfile.id,
        periodsPerWeek: 5,
        status: "ACTIVE",
        startDate: new Date("2026-06-01"),
      },
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade10.id,
        sectionId: g10SecA.id,
        subjectId: physics10.id,
        teacherProfileId: teacher2Profile.id,
        periodsPerWeek: 4,
        status: "ACTIVE",
        startDate: new Date("2026-06-01"),
      },
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade10.id,
        sectionId: g10SecA.id,
        subjectId: chem10.id,
        teacherProfileId: teacher2Profile.id,
        periodsPerWeek: 4,
        status: "ACTIVE",
        startDate: new Date("2026-06-01"),
      },
    ],
  });
  console.log("   ✅ Teaching Assignments allocated (Class Teachers & Subject Faculty)");

  console.log("\n========================================================");
  console.log("🌱 4. Creating Unconfigured School (Apex Academy)...");
  console.log("========================================================");

  const unconfiguredSchool = await prisma.school.create({
    data: {
      name: "Apex Academy",
      code: "APEX_001",
      slug: "apex-academy",
      status: "ACTIVE",
      isActive: true,
    },
  });

  const apexAdmin = await prisma.user.create({
    data: {
      name: "Arthur Pendelton",
      email: "admin@apex.local",
      passwordHash,
      role: "SCHOOL_ADMIN",
      schoolId: unconfiguredSchool.id,
      isActive: true,
    },
  });
  console.log(
    `   ✅ School created: ${unconfiguredSchool.name} (Slug: ${unconfiguredSchool.slug})`
  );
  console.log(`   ✅ School Admin:  ${apexAdmin.email}`);
  console.log("   ℹ️  Note: Apex Academy has NO academic years, NO classes, and NO students,");
  console.log("       so you can test the entire onboarding checklist & setup flow!");

  console.log("\n========================================================");
  console.log("📝 5. Creating Public Registrations for Platform Console...");
  console.log("========================================================");

  await prisma.schoolRegistration.createMany({
    data: [
      {
        schoolName: "St. Jude Collegiate School",
        schoolCode: "STJUDE_99",
        desiredSlug: "st-jude",
        adminName: "Father Michael",
        adminEmail: "michael@stjude.local",
        adminPhone: "+1 555-7788",
        status: "PENDING_REVIEW",
      },
      {
        schoolName: "Nova STEM Institute",
        schoolCode: "NOVA_88",
        desiredSlug: "nova-stem",
        adminName: "Dr. Evelyn Reed",
        adminEmail: "evelyn@novastem.local",
        adminPhone: "+1 555-9900",
        status: "PENDING_VERIFICATION",
      },
    ],
  });
  console.log("   ✅ Seeded sample registrations for Platform Admin overview");

  console.log("\n========================================================");
  console.log("🎉 SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  console.log("\n🔑 LOGIN CREDENTIALS (All accounts use password: Password@123):\n");
  console.log("1. 🛡️  Platform Super Admin:");
  console.log("   Email:    superadmin@platform.local");
  console.log("   Password: Password@123");
  console.log("   URL:      http://localhost:3000/platform");
  console.log("");
  console.log("2. 🏫 Greenwood High Academy (Fully Configured School):");
  console.log("   - School Admin:  admin@greenwood.local      (Password: Password@123)");
  console.log("   - Teacher 1:     teacher@greenwood.local    (Password: Password@123)");
  console.log("   - Teacher 2:     teacher2@greenwood.local   (Password: Password@123)");
  console.log("   - Accountant:    accountant@greenwood.local (Password: Password@123)");
  console.log("   Workspace URL:   http://localhost:3000/school/greenwood-high");
  console.log("");
  console.log("3. 🌱 Apex Academy (Unconfigured School - Test Setup Process):");
  console.log("   - School Admin:  admin@apex.local           (Password: Password@123)");
  console.log("   Workspace URL:   http://localhost:3000/school/apex-academy");
  console.log("========================================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed with error:", err);
  process.exit(1);
});
