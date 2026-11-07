"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import {
  IconTile,
  Notice,
  Spinner,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textLinkClass,
} from "@/components/common/FormControls";

export default function RegisterSchoolPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSchoolName(val);
    if (!desiredSlug || desiredSlug === val.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setDesiredSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/public/register-school", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName,
            schoolCode,
            desiredSlug,
            adminName,
            adminEmail,
            adminPhone: adminPhone || undefined,
          }),
        });

        interface ErrorResponseData {
          error?: {
            message?: string;
            details?: Array<{ message?: string }>;
          };
          message?: string;
        }
        let data: ErrorResponseData | null = null;
        try {
          data = (await res.json()) as ErrorResponseData;
        } catch {
          data = null;
        }

        if (!res.ok) {
          const specificIssue =
            data?.error?.message ||
            data?.message ||
            (Array.isArray(data?.error?.details)
              ? data.error.details
                  .map((d) => d.message)
                  .filter(Boolean)
                  .join(", ")
              : null) ||
            `Registration failed (${res.status} ${res.statusText}). Please check your input.`;
          setErrorMessage(specificIssue);
          return;
        }
        setSubmitted(true);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? `Connection error: ${err.message}`
            : "Network error occurred while connecting to the server. Please try again."
        );
      }
    });
  };

  if (submitted) {
    return (
      <PublicShell>
        <PublicSheetHeader icon={<IconTile icon={MailCheck} tone="ok" />} title="Check your inbox">
          We sent a verification link to{" "}
          <span className="font-semibold break-all text-slate-900">{adminEmail}</span>.
        </PublicSheetHeader>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-bold text-slate-900">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-slate-500">
            <li>Click the verification link in your inbox.</li>
            <li>Our platform administrator team will review your application.</li>
            <li>
              Upon approval, your school workspace and initial admin credentials will be
              provisioned.
            </li>
          </ol>
        </div>
        <div className="mt-6">
          <Link href="/login" className={secondaryButtonClass}>
            Back to sign in
          </Link>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell width="lg">
      <PublicSheetHeader title="Register your school">
        Apply for a Classic Giga workspace. Our platform team reviews each application before the
        workspace is set up.
      </PublicSheetHeader>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {errorMessage && (
          <Notice title="We couldn’t submit your application">{errorMessage}</Notice>
        )}

        <fieldset className="space-y-4">
          <legend className="sr-only">School</legend>
          <p
            aria-hidden="true"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            School
          </p>
          <div>
            <label htmlFor="schoolName" className={labelClass}>
              School name
            </label>
            <input
              id="schoolName"
              type="text"
              required
              autoComplete="organization"
              disabled={isPending}
              value={schoolName}
              onChange={handleNameChange}
              placeholder="e.g. Sunrise Public School"
              className={inputClass()}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="schoolCode" className={labelClass}>
                Official school code
              </label>
              <input
                id="schoolCode"
                type="text"
                required
                autoCapitalize="characters"
                spellCheck={false}
                disabled={isPending}
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder="e.g. SPS_01"
                className={inputClass(false, "font-mono uppercase placeholder:normal-case")}
              />
            </div>

            <div>
              <label htmlFor="desiredSlug" className={labelClass}>
                Workspace URL
              </label>
              <input
                id="desiredSlug"
                type="text"
                required
                autoCapitalize="none"
                spellCheck={false}
                disabled={isPending}
                value={desiredSlug}
                onChange={(e) => setDesiredSlug(e.target.value.toLowerCase())}
                placeholder="e.g. sunrise-public"
                aria-describedby="desiredSlug-hint"
                className={inputClass(false, "font-mono")}
              />
              <p id="desiredSlug-hint" className="mt-1.5 truncate text-xs text-slate-500">
                /school/
                <span className="font-mono text-slate-700">{desiredSlug || "your-school"}</span>
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-slate-100 pt-5">
          <legend className="sr-only">Primary contact</legend>
          <p
            aria-hidden="true"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            Primary contact
          </p>
          <div>
            <label htmlFor="adminName" className={labelClass}>
              Principal or representative name
            </label>
            <input
              id="adminName"
              type="text"
              required
              autoComplete="name"
              disabled={isPending}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Dr. Anjali Sharma"
              className={inputClass()}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="adminEmail" className={labelClass}>
                Official email
              </label>
              <input
                id="adminEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={isPending}
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="principal@yourschool.in"
                className={inputClass()}
              />
            </div>

            <div>
              <label htmlFor="adminPhone" className={labelClass}>
                Phone <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="adminPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                disabled={isPending}
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass()}
              />
            </div>
          </div>
        </fieldset>

        <button type="submit" disabled={isPending} className={`w-full ${primaryButtonClass}`}>
          {isPending && <Spinner />}
          {isPending ? "Submitting application…" : "Submit application"}
        </button>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </PublicShell>
  );
}
