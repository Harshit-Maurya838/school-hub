import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteStaffButton } from "./invite-staff-button";
import { InvitationsList } from "./invitations-list";

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-sm text-zinc-300">
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
    <div className="flex min-h-screen flex-col bg-zinc-950 p-8 font-sans text-zinc-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <a
              href={`/school/${school.slug}`}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              &larr; Back to {school.name}
            </a>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Staff Management</h1>
          <p className="text-sm text-zinc-400">
            Manage teachers, accountants, and staff invitations for {school.name}.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <InviteStaffButton schoolSlug={school.slug} />
          <span className="rounded-full border border-indigo-800 bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-400">
            {user.role}
          </span>
          <span className="text-sm text-zinc-300">{user.email}</span>
        </div>
      </header>

      <main className="space-y-8">
        {/* Active Staff Members */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Active Staff Members ({staffMembers.length})
            </h2>
          </div>
          {staffMembers.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No active staff members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {staffMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                      <td className="px-4 py-3">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-xs text-indigo-300">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                            member.isActive
                              ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
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
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Staff Invitations ({invitations.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Active, pending, or revoked invitations for teachers and accountants.
              </p>
            </div>
            <InviteStaffButton schoolSlug={school.slug} />
          </div>
          <InvitationsList schoolSlug={school.slug} initialInvitations={invitations} />
        </section>
      </main>
    </div>
  );
}
