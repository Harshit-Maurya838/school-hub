import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ schoolSlug: string }>;
}

/** Subjects are managed per class on the Classes & Subjects screen. */
export default async function AcademicSubjectsPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  redirect(`/school/${schoolSlug}/academics/classes`);
}
