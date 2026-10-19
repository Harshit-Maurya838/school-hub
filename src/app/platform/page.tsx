import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-8 font-sans text-zinc-100">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
          <p className="text-sm text-zinc-400">Multi-Tenant School Management SaaS Platform</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-400">
            SUPER_ADMIN
          </span>
          <span className="text-sm text-zinc-300">{user.email}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs tracking-wider text-zinc-400 uppercase">Customer Schools</p>
          <p className="mt-2 text-3xl font-bold text-white">{schools.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Active institutional tenants</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs tracking-wider text-zinc-400 uppercase">Pending Registrations</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{pendingCount}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Awaiting applicant verification or admin review
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs tracking-wider text-zinc-400 uppercase">Platform Security</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">Enforced</p>
          <p className="mt-1 text-xs text-zinc-500">Tenant isolation & cryptographic auth</p>
        </div>
      </div>

      <main className="space-y-8">
        {/* Customer Schools Table */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tenant Schools ({schools.length})</h2>
          </div>
          {schools.length === 0 ? (
            <p className="text-sm text-zinc-500">No schools provisioned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">School Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Staff / Users</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {schools.map((school) => (
                    <tr key={school.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{school.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-400">{school.code}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        /school/{school.slug}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400">
                          {school.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{school._count.users}</td>
                      <td className="px-4 py-3">{school._count.students}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/school/${school.slug}`}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          View School &rarr;
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Public SaaS Registrations Applications */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Registration Applications ({registrations.length})
            </h2>
          </div>
          {registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">No public applications submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">School Name</th>
                    <th className="px-4 py-3">Code / Slug</th>
                    <th className="px-4 py-3">Contact Admin</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{reg.schoolName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {reg.schoolCode} / {reg.desiredSlug}
                      </td>
                      <td className="px-4 py-3">
                        <div>{reg.adminName}</div>
                        <div className="text-xs text-zinc-500">{reg.adminEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            reg.status === "APPROVED"
                              ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                              : reg.status === "PENDING_REVIEW"
                                ? "border border-amber-800 bg-amber-950 text-amber-300"
                                : reg.status === "PENDING_VERIFICATION"
                                  ? "bg-zinc-800 text-zinc-400"
                                  : "border border-red-800 bg-red-950 text-red-400"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
