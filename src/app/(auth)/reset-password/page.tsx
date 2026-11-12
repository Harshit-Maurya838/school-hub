"use client";

import React, { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import {
  FieldError,
  IconTile,
  Notice,
  PasswordToggle,
  PublicLoading,
  Spinner,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/common/FormControls";

type FieldErrors = { password?: string; confirmPassword?: string };

function ResetPasswordContent() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <PublicShell>
        <PublicSheetHeader
          icon={<IconTile icon={TriangleAlert} tone="alert" />}
          title="This reset link can’t be used"
        >
          The link is missing its token. Open the link from your email again, or request a new one.
        </PublicSheetHeader>
        <div className="mt-6">
          <Link href="/forget-password" className={secondaryButtonClass}>
            Request a new link
          </Link>
        </div>
      </PublicShell>
    );
  }

  if (done) {
    return (
      <PublicShell>
        <PublicSheetHeader icon={<IconTile icon={CircleCheck} tone="ok" />} title="Password reset">
          Your password has been changed and every existing session has been signed out.
        </PublicSheetHeader>
        <div className="mt-6">
          <Link href="/login" className={primaryButtonClass}>
            Sign in
          </Link>
        </div>
      </PublicShell>
    );
  }

  const validate = () => {
    const errs: FieldErrors = {};
    if (password.length < 8) errs.password = "Password must be at least 8 characters long";
    else if (!/[A-Z]/.test(password))
      errs.password = "Password must contain at least one uppercase letter";
    else if (!/[0-9]/.test(password)) errs.password = "Password must contain at least one number";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setFormError(data?.error?.message || "Could not reset your password. Please try again.");
          return;
        }
        setDone(true);
      } catch {
        setFormError("Network error occurred. Please check your connection and try again.");
      }
    });
  };

  return (
    <PublicShell>
      <PublicSheetHeader title="Choose a new password">
        Resetting your password signs you out on every device.
      </PublicSheetHeader>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        {formError && <Notice>{formError}</Notice>}

        <div>
          <label htmlFor="password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={`password-hint${fieldErrors.password ? " password-error" : ""}`}
              className={inputClass(Boolean(fieldErrors.password), "pr-11")}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>
          {fieldErrors.password ? (
            <FieldError id="password-error">{fieldErrors.password}</FieldError>
          ) : (
            <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
              At least 8 characters, with one uppercase letter and one number.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            disabled={isPending}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
            className={inputClass(Boolean(fieldErrors.confirmPassword))}
          />
          <FieldError id="confirmPassword-error">{fieldErrors.confirmPassword}</FieldError>
        </div>

        <button type="submit" disabled={isPending} className={`w-full ${primaryButtonClass}`}>
          {isPending && <Spinner />}
          {isPending ? "Saving…" : "Reset password"}
        </button>
      </form>
    </PublicShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PublicLoading label="Loading…" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
