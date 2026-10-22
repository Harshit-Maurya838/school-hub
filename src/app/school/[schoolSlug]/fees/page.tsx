import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeesClient } from "@/components/fees/FeesClient";
import { Shield } from "lucide-react";

interface FeesPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function FeesPage({ params }: FeesPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/fees`);
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

  // Cross-tenant access protection
  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 text-base font-extrabold text-rose-700">Access Denied</h2>
          <p className="text-xs text-slate-600">
            You do not have permission to access financial records for {school.name}. Tenant
            boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  // Deny Teachers from fee collection or finance administration
  if (user.role === "TEACHER") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Finance Access Restricted</h2>
            <p className="mt-1 text-xs text-slate-500">
              Fee collection, invoice generation, and student billing are restricted to Authorized
              Cashiers, Accountants, and School Administrators. Teachers do not have routine finance
              administration permissions.
            </p>
          </div>
          <Link
            href={`/school/${school.slug}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Return to Faculty Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Super Admin platform restriction notice
  if (user.role === "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-purple-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Platform Admin Authorization</h2>
            <p className="mt-1 text-xs text-slate-500">
              Platform Super Administrators retain platform-level access only and cannot execute
              routine tenant financial collections without explicit school-scoped authorization.
              Please use the tenant-assigned School Administrator or Accountant profile.
            </p>
          </div>
          <Link
            href="/platform"
            className="inline-flex w-full items-center justify-center rounded-xl bg-purple-700 py-2.5 text-xs font-bold text-white transition-colors hover:bg-purple-800"
          >
            Go to Platform Console
          </Link>
        </div>
      </div>
    );
  }

  // Active academic session
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
    select: { id: true, name: true },
  });

  const allAcademicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  });

  // Classes & sections for fee mapping
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    include: {
      sections: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
  });

  return (
    <FeesClient
      schoolSlug={school.slug}
      schoolName={school.name}
      schoolCode={school.code}
      userRole={user.role}
      userName={user.name}
      userId={user.id}
      activeAcademicYear={activeYear}
      allAcademicYears={allAcademicYears}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        sections: c.sections,
      }))}
    />
  );
}
