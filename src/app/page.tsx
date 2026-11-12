import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/modules/auth";
import { LandingBook } from "./_landing/LandingBook";
import { registerSerif } from "./_landing/fonts";

export const metadata: Metadata = {
  title: "Academix AI | School Management for K-12 Schools",
  description:
    "Attendance, examinations, students, staff and fees for K-12 schools, with locked registers, reviewed marks, numbered receipts and a full audit trail.",
};

export default async function Home() {
  const user = await getAuthenticatedUser();

  const destination = user?.role === "SUPER_ADMIN" ? "/platform" : user ? "/school" : "/auth";

  return (
    <main
      className={`${registerSerif.variable} landing-desk min-h-screen font-sans text-slate-800 antialiased`}
    >
      <LandingBook signedIn={Boolean(user)} destination={destination} />
    </main>
  );
}
