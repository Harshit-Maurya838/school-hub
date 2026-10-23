import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Your School",
  description:
    "Apply to register your educational institution on CampusPlus and get access to modern school management tools.",
};

export default function RegisterSchoolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
