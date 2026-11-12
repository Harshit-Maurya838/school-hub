import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { SchoolLayoutClient } from "@/components/layout/SchoolLayoutClient";
import type { ManagementContact } from "@/components/layout/topbar/ProfileMenu";
import { HOS_DESIGNATIONS, labelFor } from "@/modules/onboarding";

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
    description: `Manage academics, attendance, examinations, and student life at ${school.name} on Classic Giga.`,
  };
}

export default async function SchoolSlugLayout({ children, params }: SchoolLayoutProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/auth?callbackUrl=/school/${schoolSlug}`);
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

  // Session badge, UDISE code and leadership for the top bar
  const [currentYear, profile, schoolAdmins] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true },
      select: { name: true },
    }),
    prisma.schoolProfile.findUnique({
      where: { schoolId: school.id },
      select: {
        udiseCode: true,
        hosDesignation: true,
        hosName: true,
        hosEmail: true,
        hosMobile: true,
        managementName: true,
        managementPhone: true,
      },
    }),
    prisma.user.findMany({
      where: { schoolId: school.id, role: "SCHOOL_ADMIN", isActive: true },
      select: { name: true, email: true },
      orderBy: { createdAt: "asc" },
      take: 3,
    }),
  ]);

  const management: ManagementContact[] = [];
  if (profile?.managementName) {
    management.push({
      title: "Management / Trust",
      name: profile.managementName,
      phone: profile.managementPhone,
    });
  }
  if (profile?.hosName) {
    management.push({
      title: labelFor(HOS_DESIGNATIONS, profile.hosDesignation) || "Head of School",
      name: profile.hosName,
      email: profile.hosEmail,
      phone: profile.hosMobile,
    });
  }
  for (const admin of schoolAdmins) {
    management.push({ title: "School Admin", name: admin.name, email: admin.email });
  }

  return (
    <SchoolLayoutClient
      schoolSlug={school.slug}
      schoolName={school.name}
      schoolCode={school.code}
      udiseCode={profile?.udiseCode}
      management={management}
      userName={user.name}
      userRole={user.role}
      userEmail={user.email || ""}
      currentSession={currentYear?.name || "Not Configured"}
    >
      {children}
    </SchoolLayoutClient>
  );
}
