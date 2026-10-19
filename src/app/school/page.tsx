import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SchoolIndexPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "SUPER_ADMIN") {
    redirect("/platform");
  }

  if (!user.schoolId) {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { slug: true },
  });

  if (school?.slug) {
    redirect(`/school/${school.slug}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-xl font-bold">School Portal</h1>
      <p className="text-zinc-400">Loading your school workspace...</p>
    </div>
  );
}
