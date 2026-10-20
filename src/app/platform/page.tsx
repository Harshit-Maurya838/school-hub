import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Building2,
  Users,
  GraduationCap,
  Clock,
  Sparkles,
  School,
  Layers,
  ChevronRight,
} from "lucide-react";

export default async function PlatformPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const [schools, registrations] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, students: true },
        },
      },
    }),
    prisma.schoolRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const pendingCount = registrations.filter(
    (r) => r.status === "PENDING_VERIFICATION" || r.status === "PENDING_REVIEW"
  ).length;

  const totalStudents = schools.reduce((acc, s) => acc + s._count.students, 0);
  const totalStaff = schools.reduce((acc, s) => acc + s._count.users, 0);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Top Platform Bar */}
      <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">
                  CampusPulse Cloud
                </span>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-black tracking-wider text-purple-300 uppercase">
                  Platform Console
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Tenant School SaaS Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Tenant DB Connected</span>
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-white">{user.name || "Platform Admin"}</p>
                <p className="font-mono text-[11px] text-purple-400">{user.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-xs font-black text-white shadow-md">
                SA
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Super Administrator Oversight</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Global Platform Infrastructure
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Oversee institution onboarding, inspect active tenant school databases, and access
                any school workspace with administrative authority.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 hover:shadow-purple-600/50"
              >
                <School className="h-4 w-4" />
                <span>Provision New School</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Customer Schools
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">{schools.length}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-flex items-center text-purple-400 font-bold">100%</span>
              <span>isolated tenant schemas</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Total Enrolled
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">{totalStudents}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">Active</span>
              <span>across all institutions</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Staff & Educators
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">{totalStaff}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-blue-400 font-bold">RBAC</span>
              <span>Admins, Teachers & Accountants</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Pending Onboarding
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-amber-400">{pendingCount}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Awaiting applicant verification</span>
            </div>
          </div>
        </div>

        {/* Customer Schools Table */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-black tracking-tight text-white">
                  Tenant Schools Roster ({schools.length})
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any school to enter its workspace with Super Admin privileges
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                {schools.length} Active Deployments
              </span>
            </div>
          </div>

          {schools.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-700" />
              <p className="mt-3 text-sm font-semibold text-slate-400">
                No customer schools provisioned yet.
              </p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                Register First School
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-4">School Name</th>
                    <th className="px-6 py-4">School Code</th>
                    <th className="px-6 py-4">URL Route</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Staff Accounts</th>
                    <th className="px-6 py-4 text-center">Students</th>
                    <th className="px-6 py-4 text-right">Access Console</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {schools.map((school) => (
                    <tr
                      key={school.id}
                      className="group transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 font-black text-purple-300 border border-purple-500/20">
                            {school.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-purple-300 transition-colors">
                              {school.name}
                            </p>
                            <p className="text-[11px] text-slate-500">ID: {school.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                          {school.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        /school/{school.slug}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            school.status === "ACTIVE"
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              school.status === "ACTIVE" ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          {school.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-200">
                        {school._count.users}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-200">
                        {school._count.students}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/school/${school.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-300 transition-all hover:border-purple-500 hover:bg-purple-600 hover:text-white"
                        >
                          <span>Open Workspace</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Public SaaS Registrations Applications */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-black tracking-tight text-white">
                  Recent School Registrations ({registrations.length})
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                New school onboarding queue from the public registration portal
              </p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              {pendingCount} Pending Verification
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="p-16 text-center">
              <Clock className="mx-auto h-12 w-12 text-slate-700" />
              <p className="mt-3 text-sm font-semibold text-slate-400">
                No registration applications submitted yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-4">Applicant Institution</th>
                    <th className="px-6 py-4">Desired Code / Slug</th>
                    <th className="px-6 py-4">Contact Admin</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="transition-colors hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{reg.schoolName}</p>
                        <p className="text-[11px] text-slate-500">ID: {reg.id}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-purple-300">
                          {reg.schoolCode}
                        </span>{" "}
                        <span className="text-slate-500">/ {reg.desiredSlug}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200">{reg.adminName}</p>
                        <p className="font-mono text-[11px] text-slate-400">{reg.adminEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            reg.status === "APPROVED"
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : reg.status === "PENDING_REVIEW"
                                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : reg.status === "PENDING_VERIFICATION"
                                  ? "border border-blue-500/30 bg-blue-500/10 text-blue-300"
                                  : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              reg.status === "APPROVED"
                                ? "bg-emerald-400"
                                : reg.status === "PENDING_REVIEW"
                                  ? "bg-amber-400"
                                  : reg.status === "PENDING_VERIFICATION"
                                    ? "bg-blue-400"
                                    : "bg-rose-400"
                            }`}
                          />
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
