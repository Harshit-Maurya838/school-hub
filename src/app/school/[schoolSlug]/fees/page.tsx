import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModuleUnderDevelopment } from "@/components/common/ModuleUnderDevelopment";
import { CreditCard } from "lucide-react";

interface FeesPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function FeesPage({ params }: FeesPageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?callbackUrl=/school/${schoolSlug}/fees`);
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
      moduleName="Fees Management & Collection"
      description="Fee structure configuration, student ledgers, receipt generation, and payment reconciliation."
      icon={CreditCard}
      schoolSlug={school.slug}
      plannedFeatures={[
        "Class-wise Fee Head Definitions",
        "Term & Installment Schedules",
        "Printed GST/Tax Invoices",
        "Defaulters & Dues Tracking",
        "Online Gateway Integration",
        "Bank Reconciliation Ledgers",
      ]}
    />
  );
}
