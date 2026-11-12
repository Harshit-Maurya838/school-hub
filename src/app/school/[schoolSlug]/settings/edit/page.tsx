import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { getSchoolProfile } from "@/modules/onboarding/services/school-profile";
import { SchoolSettingsClient } from "@/modules/onboarding";

interface PageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function EditSchoolProfilePage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/auth?callbackUrl=/school/${schoolSlug}/settings/edit`);
  }

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, code: true, slug: true },
  });
  if (!school) notFound();

  const viewHref = `/school/${school.slug}/settings`;
  // Only this school's admin edits, and only while the profile is unlocked; the profile page
  // explains the refusal to everyone else.
  if (user.role !== "SCHOOL_ADMIN" || user.schoolId !== school.id) redirect(viewHref);

  const profile = await getSchoolProfile(school.id);
  if (profile.lock.isLocked) redirect(viewHref);

  return (
    <SchoolSettingsClient
      schoolSlug={school.slug}
      school={school}
      initialProfile={profile}
      mode="edit"
      canEdit
      canLock
    />
  );
}
