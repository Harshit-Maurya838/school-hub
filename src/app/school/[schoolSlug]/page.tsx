import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SchoolPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSlugPage({ params }: SchoolPageProps) {
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-sm text-zinc-300">
            You do not have permission to access {school.name}. Tenant boundary violation detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-8 font-sans text-zinc-100">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{school.name}</h1>
          <p className="text-sm text-zinc-400">School Code: {school.code}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-indigo-800 bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-400">
            {user.role}
          </span>
          <span className="text-sm text-zinc-300">{user.email}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Students</h2>
          <p className="text-sm text-zinc-400">
            Manage admissions, student directories, and records.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Academics</h2>
          <p className="text-sm text-zinc-400">
            Classes, sections, subjects, and academic year schedules.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Attendance</h2>
          <p className="text-sm text-zinc-400">Daily attendance tracking and reporting.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Financials</h2>
          <p className="text-sm text-zinc-400">Fee structures, invoices, and payment receipts.</p>
        </div>
      </main>
    </div>
  );
}
