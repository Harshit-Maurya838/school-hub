import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { logger } from "../src/lib/logger";

async function bootstrap() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "superadmin@atenea.local")
    .toLowerCase()
    .trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "AdminSecurePass123!";
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "Platform Super Administrator";

  console.log(`Checking for existing platform administrator with email: ${email}`);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { role: "SUPER_ADMIN" }],
    },
  });

  if (existing) {
    console.log(
      `A Super Admin account already exists (ID: ${existing.id}, Email: ${existing.email}). Aborting bootstrap.`
    );
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      schoolId: null, // Platform Super Admin has no schoolId
      isActive: true,
    },
  });

  console.log(`\n Platform Super Administrator successfully bootstrapped:`);
  console.log(`   ID:       ${admin.id}`);
  console.log(`   Name:     ${admin.name}`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Role:     ${admin.role}`);
  console.log(`   SchoolId: ${admin.schoolId ?? "null (Platform Scope)"}`);
  console.log(`\n Note: Change the password immediately in production environments.\n`);

  process.exit(0);
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to bootstrap platform administrator");
  process.exit(1);
});
