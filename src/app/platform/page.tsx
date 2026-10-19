import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function PlatformPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-8 font-sans text-zinc-100">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
          <p className="text-sm text-zinc-400">Multi-Tenant School Management Platform</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-400">
            SUPER_ADMIN
          </span>
          <span className="text-sm text-zinc-300">{user.email}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Schools Management</h2>
          <p className="text-sm text-zinc-400">
            Create, configure, and monitor tenant schools across the SaaS network.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">System Audit Logs</h2>
          <p className="text-sm text-zinc-400">
            View platform-wide security and operational audit trails.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Global Settings</h2>
          <p className="text-sm text-zinc-400">
            Configure global platform policies, integrations, and limits.
          </p>
        </div>
      </main>
    </div>
  );
}
