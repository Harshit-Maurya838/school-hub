import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

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
}

seed();