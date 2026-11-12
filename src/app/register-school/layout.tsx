import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Your School",
  description:
    "Register your school on Classic Giga, verify your email with a one-time code, and get instant access to your school dashboard.",
};

export default function RegisterSchoolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
