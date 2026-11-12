"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, MailCheck } from "lucide-react";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import {
  FieldError,
  IconTile,
  Notice,
  Spinner,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textLinkClass,
} from "@/components/common/FormControls";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Enter a valid email address");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setFormError(data?.error?.message || "Could not send the reset link. Please try again.");
          return;
        }
        setSent(true);
      } catch {
        setFormError("Network error occurred. Please check your connection and try again.");
      }
    });
  };

  if (sent) {
    return (
      <PublicShell>
        <PublicSheetHeader icon={<IconTile icon={MailCheck} tone="ok" />} title="Check your email">
          If an account exists for <span className="font-semibold text-slate-900">{email}</span>, we
          have sent a link to reset your password. It expires in 60 minutes.
        </PublicSheetHeader>
        <div className="mt-6">
          <Link href="/login" className={secondaryButtonClass}>
            Back to sign in
          </Link>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PublicSheetHeader icon={<IconTile icon={KeyRound} />} title="Reset your password">
        Enter the email you sign in with and we will send you a reset link. If your account has no
        email, ask your school administrator.
      </PublicSheetHeader>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        {formError && <Notice>{formError}</Notice>}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "email-error" : undefined}
            className={inputClass(Boolean(fieldError))}
          />
          <FieldError id="email-error">{fieldError}</FieldError>
        </div>

        <button type="submit" disabled={isPending} className={`w-full ${primaryButtonClass}`}>
          {isPending && <Spinner />}
          {isPending ? "Sending…" : "Send reset link"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/login" className={textLinkClass}>
            Sign in
          </Link>
        </p>
      </form>
    </PublicShell>
  );
}
