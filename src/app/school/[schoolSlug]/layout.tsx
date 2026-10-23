import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SchoolLayoutClient } from "@/components/layout/SchoolLayoutClient";

interface SchoolLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    schoolSlug: string;
  }>;
}

export async function generateMetadata({ params }: SchoolLayoutProps): Promise<Metadata> {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { name: true },
  });

  if (!school) {
    return {
      title: "School Portal",
    };
  }

  return {
    title: `${school.name} Portal`,
    description: `Manage academics, attendance, examinations, and student life at ${school.name} on CampusPlus.`,
  };
}

export default async function SchoolSlugLayout({ children, params }: SchoolLayoutProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      isActive: true,
    },
  });

  if (!school) {
    notFound();
  }

  // Cross-tenant protection: non-SUPER_ADMIN cannot access another school
  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
        <div className="max-w-md rounded-2xl border border-red-200/20 bg-red-950/40 p-6 text-center shadow-xl">
          <h2 className="mb-2 text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-sm text-slate-300">
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Retrieve current active academic year for the session indicator badge
  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
    select: { name: true },
  });

  return (
    <SchoolLayoutClient
      schoolSlug={school.slug}
      schoolName={school.name}
      schoolCode={school.code}
      userName={user.name}
      userRole={user.role}
      userEmail={user.email || ""}
      currentSession={currentYear?.name || "Not Configured"}
    >
      {children}
    </SchoolLayoutClient>
  );
}
