import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Sign In",
  description: "Sign in to access your CampusPlus school management dashboard.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
