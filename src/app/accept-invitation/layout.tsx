import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept Portal Invitation",
  description:
    "Accept your school invitation on CampusPlus and set up your portal credentials securely.",
};

export default function AcceptInvitationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
