import type { Metadata } from "next";
import Link from "next/link";
import { getAuthenticatedUser } from "@/modules/auth";
import { BrandMark } from "@/components/layout/PublicShell";
import { primaryButtonClass, secondaryButtonClass } from "@/components/common/FormControls";

export const metadata: Metadata = {
  title: "Classic Giga | School Management for K-12 Schools",
  description:
    "Attendance, examinations, students, staff and fees for K-12 schools, with locked registers, reviewed marks, numbered receipts and a full audit trail.",
};

export default async function Home() {
  const user = await getAuthenticatedUser();

  const destination = user?.role === "SUPER_ADMIN" ? "/platform" : user ? "/school" : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <BrandMark />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-black tracking-tight text-balance text-slate-900 sm:text-5xl">
            School records your office can stand behind.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-slate-600">
            Attendance, examinations, students, staff and fees in one place. Registers lock when
            submitted, marks are reviewed before they reach parents, every payment gets a numbered
            receipt, and every correction leaves an audit trail.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={destination} className={primaryButtonClass}>
              {user ? "Go to dashboard" : "Sign in"}
            </Link>
            {!user && (
              <Link href="/register-school" className={secondaryButtonClass}>
                Register your school
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
