"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import {
  IconTile,
  PublicLoading,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/common/FormControls";

function VerifyRegistrationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState(
    !token ? "Verification token is missing from the link." : ""
  );

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(
          `/api/v1/public/register-school/verify?token=${encodeURIComponent(token as string)}`
        );
        const data = await res.json();

        if (res.ok) {
          setSuccess(true);
          setMessage(data.data?.message || "Email verified successfully!");
        } else {
          setSuccess(false);
          setMessage(data.error?.message || "Invalid or expired verification token.");
        }
      } catch {
        setSuccess(false);
        setMessage("Unable to contact verification service. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  if (loading) {
    return <PublicLoading label="Verifying your email address…" />;
  }

  return (
    <PublicShell>
      {success ? (
        <>
          <PublicSheetHeader
            icon={<IconTile icon={CircleCheck} tone="ok" />}
            title="Email verified"
          >
            {message}
          </PublicSheetHeader>
          <div className="mt-6">
            <Link href="/login" className={primaryButtonClass}>
              Go to sign in
            </Link>
          </div>
        </>
      ) : (
        <>
          <PublicSheetHeader
            icon={<IconTile icon={TriangleAlert} tone="alert" />}
            title="We couldn’t verify this link"
          >
            {message}
          </PublicSheetHeader>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register-school" className={primaryButtonClass}>
              Submit a new registration
            </Link>
            <Link href="/login" className={secondaryButtonClass}>
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </PublicShell>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <Suspense fallback={<PublicLoading label="Loading verification…" />}>
      <VerifyRegistrationContent />
    </Suspense>
  );
}
