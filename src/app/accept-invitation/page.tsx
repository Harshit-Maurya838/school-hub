"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
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
import { getRoleDisplayName, getRoleTheme } from "@/modules/auth/services/role-ui";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  schoolName: string;
  schoolSlug: string;
  expiresAt: string;
  guardian?: { name: string; phone: string } | null;
  student?: { name: string; admissionNumber: string } | null;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(
    !token ? "Invitation token is missing from the link. Please check your invitation email." : null
  );

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(
          `/api/v1/auth/invitations/verify?token=${encodeURIComponent(token as string)}`
        );
        const json = await res.json();

        if (!res.ok) {
          setLoadError(json?.error?.message || "Invalid or expired invitation link.");
          setLoading(false);
          return;
        }

        setInvitation(json.data.invitation);
        if (json.data.invitation.guardian?.name) {
          setName(json.data.invitation.guardian.name);
        } else if (json.data.invitation.student?.name) {
          setName(json.data.invitation.student.name);
        }
      } catch {
        setLoadError(
          "Unable to verify invitation link. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  const validate = (): boolean => {
    const errs: { name?: string; password?: string; confirmPassword?: string } = {};

    if (!name.trim()) {
      errs.name = "Full name is required";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters long";
    } else if (!/[A-Z]/.test(password)) {
      errs.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      errs.password = "Password must contain at least one number";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate() || !token) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            name: name.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setFormError(data?.error?.message || "Failed to set up account. Please try again.");
          return;
        }

        const destination = data.data?.redirectUrl || "/";
        router.push(destination);
        router.refresh();
      } catch {
        setFormError("Network error during account setup. Please try again.");
      }
    });
  };

  if (loading) {
    return <PublicLoading label="Checking your invitation…" />;
  }

  if (loadError || !invitation) {
    return (
      <PublicShell>
        <PublicSheetHeader
          icon={<IconTile icon={TriangleAlert} tone="alert" />}
          title="This invitation can’t be used"
        >
          {loadError}
        </PublicSheetHeader>
        <div className="mt-6">
          <Link href="/login" className={secondaryButtonClass}>
            Back to sign in
          </Link>
        </div>
      </PublicShell>
    );
  }

  const roleTheme = getRoleTheme(invitation.role);

  return (
    <PublicShell>
      <PublicSheetHeader title="Activate your account">
        You’ve been invited to join{" "}
        <span className="font-semibold text-slate-900">{invitation.schoolName}</span>.
      </PublicSheetHeader>

      <dl className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">Role</dt>
        <dd>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
          >
            {getRoleDisplayName(invitation.role)}
          </span>
        </dd>
        <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">Email</dt>
        <dd className="min-w-0 truncate font-medium text-slate-800">{invitation.email}</dd>
      </dl>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        {formError && <Notice>{formError}</Notice>}

        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            disabled={isPending}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={inputClass(Boolean(fieldErrors.name))}
            placeholder="e.g. Priya Nair"
          />
          <FieldError id="name-error">{fieldErrors.name}</FieldError>
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Choose a password
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
            Confirm password
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
          {isPending ? "Setting up your account…" : "Activate and sign in"}
        </button>
      </form>
    </PublicShell>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<PublicLoading label="Loading invitation…" />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
