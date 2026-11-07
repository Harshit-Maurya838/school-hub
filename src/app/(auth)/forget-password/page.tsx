import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import { IconTile, secondaryButtonClass } from "@/components/common/FormControls";

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <PublicSheetHeader icon={<IconTile icon={KeyRound} />} title="Reset your password">
        Password resets are issued by your school or platform administrator. Contact them to regain
        access.
      </PublicSheetHeader>
      <div className="mt-6">
        <Link href="/login" className={secondaryButtonClass}>
          Back to sign in
        </Link>
      </div>
    </PublicShell>
  );
}
