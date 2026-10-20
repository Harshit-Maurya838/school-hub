import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteStaffButton } from "./invite-staff-button";
import { InvitationsList } from "./invitations-list";
import { Users, Shield } from "lucide-react";

interface StaffPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolStaffPage({ params }: StaffPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/staff`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
    },
  });

  if (!school) {
    notFound();
  }

  if (user.role !== "SUPER_ADMIN" && user.schoolId !== school.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <h2 className="mb-2 text-base font-extrabold text-rose-700">Access Denied</h2>
          <p className="text-xs text-slate-600">
            You do not have permission to view staff for this school.
          </p>
        </div>
      </div>
    );
  }

  // Fetch active staff members
  const staffMembers = await prisma.user.findMany({
    where: {
      schoolId: school.id,
      role: { in: ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"] },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Fetch pending/active invitations
  const rawInvitations = await prisma.invitation.findMany({
    where: {
      schoolId: school.id,
      role: { in: ["TEACHER", "ACCOUNTANT"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const invitations = rawInvitations.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${school.slug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {school.name} ({school.code})
            </Link>
            <span>/</span>
            <span className="text-slate-800">Staff</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Staff Directory & Access Control
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage teachers, accountants, administrators, and team member invitations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{user.role}</span>
          </div>

          <InviteStaffButton schoolSlug={school.slug} />
        </div>
      </div>

      {/* Active Staff Members */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Active Staff Roster ({staffMembers.length})
            </h3>
            <p className="text-xs text-slate-400">
              Authorized school instructors and staff accounts
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            {staffMembers.length} Members
          </span>
        </div>

        {staffMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-xs text-slate-500">No active staff members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffMembers.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-extrabold text-emerald-800">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          member.isActive
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.isActive ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        />
                        <span>{member.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Staff Invitations */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Pending & Past Invitations ({invitations.length})
            </h3>
            <p className="text-xs text-slate-400">
              Active invitation links for prospective instructors and accountants
            </p>
          </div>
          <InviteStaffButton schoolSlug={school.slug} />
        </div>
        <div className="p-5">
          <InvitationsList schoolSlug={school.slug} initialInvitations={invitations} />
        </div>
      </section>
    </div>
  );
}
