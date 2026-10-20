import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModuleUnderDevelopment } from "@/components/common/ModuleUnderDevelopment";
import { GraduationCap } from "lucide-react";

interface ExamsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function ExamsPage({ params }: ExamsPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/exams`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true },
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
            You do not have permission to access {school.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ModuleUnderDevelopment
      moduleName="Exams & Grading Engine"
      description="Exam scheduling, scholastic marks entry, grading rubrics, and CBSE/RBSE report card generation."
      icon={GraduationCap}
      schoolSlug={school.slug}
      plannedFeatures={[
        "Term Assessment Scheduling",
        "Grade & Marksheet Templates",
        "Subject-wise Marks Entry",
        "Top Performer / Topper Analytics",
        "Report Card PDF Generation",
        "Parent Portal Grade Access",
      ]}
    />
  );
}
