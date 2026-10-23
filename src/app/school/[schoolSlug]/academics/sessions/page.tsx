import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AcademicSessionsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  redirect(`/school/${schoolSlug}/settings/academic`);
}
