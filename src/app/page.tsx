import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function Home() {
  const user = await getAuthenticatedUser();

  const destination = user?.role === "SUPER_ADMIN" ? "/platform" : user ? "/school" : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 font-sans text-zinc-100">
      <div className="max-w-2xl space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
          Multi-Tenant SaaS
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Atenea School Management
        </h1>
        <p className="text-lg text-zinc-400">
          Enterprise multi-tenant education platform with role-based access control, strict tenant
          boundary isolation, and comprehensive audit trails.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href={destination}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {user ? "Go to Dashboard" : "Sign In to Portal"}
          </Link>
        </div>
      </div>
    </div>
  );
}
