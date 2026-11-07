import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept Invitation",
  description:
    "Accept your school invitation on Classic Giga and set up your portal credentials securely.",
};

export default function AcceptInvitationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
