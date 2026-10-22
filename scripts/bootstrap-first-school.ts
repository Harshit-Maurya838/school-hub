import { prisma } from "../src/lib/prisma";
import { provisionSchoolWithAdmin } from "../src/lib/provisioning";
import { logger } from "../src/lib/logger";

async function bootstrapFirstSchool() {
  const schoolName = process.env.BOOTSTRAP_SCHOOL_NAME || "Demo International School";
  const schoolCode = process.env.BOOTSTRAP_SCHOOL_CODE || "DEMO_SCH_01";
  const schoolSlug = process.env.BOOTSTRAP_SCHOOL_SLUG || "demo-international";
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME || "Principal Davis";
  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@demo.school")
    .toLowerCase()
    .trim();

  console.log(`\n======================================================`);
  console.log(`🚀 Provisioning First Tenant School Customer`);
  console.log(`======================================================`);
  console.log(`School Name: ${schoolName}`);
  console.log(`School Code: ${schoolCode}`);
  console.log(`School Slug: ${schoolSlug}`);
  console.log(`Admin Email: ${adminEmail}`);

  // Check if school already exists
  const existingSchool = await prisma.school.findFirst({
    where: {
      OR: [{ code: schoolCode }, { slug: schoolSlug }],
    },
  });

  if (existingSchool) {
    console.log(
      `\n⚠️  School already exists (ID: ${existingSchool.id}, Name: ${existingSchool.name}). Aborting bootstrap.\n`
    );
    process.exit(0);
  }

  // Provision school & activation invitation
  const result = await provisionSchoolWithAdmin({
    name: schoolName,
    code: schoolCode,
    slug: schoolSlug,
    adminName,
    adminEmail,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  console.log(`\n✅ School successfully provisioned!`);
  console.log(`   School ID:   ${result.school.id}`);
  console.log(`   School Slug: ${result.school.slug}`);
  console.log(`   Admin Role:  SCHOOL_ADMIN`);
  console.log(`\n🔑 Initial Activation Link (One-Time Setup):`);
  console.log(`   ${result.activationUrl}\n`);
  console.log(`Share this secure link with the school administrator to set their password.`);
  console.log(`======================================================\n`);

  process.exit(0);
}

bootstrapFirstSchool().catch((err) => {
  logger.error({ err }, "Failed to bootstrap first tenant school");
  console.error("Bootstrap error:", err.message);
  process.exit(1);
});
