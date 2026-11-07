"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicShell, PublicSheetHeader } from "@/components/layout/PublicShell";
import {
  FieldError,
  Notice,
  PasswordToggle,
  PublicLoading,
  Spinner,
  inputClass,
  labelClass,
  primaryButtonClass,
  textLinkClass,
} from "@/components/common/FormControls";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isPending, startTransition] = useTransition();

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Use generic error message to prevent account enumeration
          setErrorMessage(
            data?.error?.message || "Invalid email or password. Please check your credentials."
          );
          return;
        }

        // Sanitize callback URL to prevent open redirect vulnerabilities
        let destination = "/";
        const trimmedCallback = rawCallbackUrl?.trim();
        if (
          trimmedCallback &&
          trimmedCallback.startsWith("/") &&
          !trimmedCallback.startsWith("//") &&
          !trimmedCallback.includes(":")
        ) {
          destination = trimmedCallback;
        } else if (data.data?.user?.role === "SUPER_ADMIN") {
          destination = "/platform";
        } else if (data.data?.user?.schoolSlug) {
          destination = `/school/${data.data.user.schoolSlug}`;
        } else {
          destination = "/school";
        }

        router.push(destination);
        router.refresh();
      } catch {
        setErrorMessage("Network error occurred. Please check your connection and try again.");
      }
    });
  };

  return (
    <PublicShell>
      <PublicSheetHeader title="Sign in">
        Use the email your school invited you with.
      </PublicSheetHeader>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        {errorMessage && <Notice>{errorMessage}</Notice>}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isPending}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={inputClass(Boolean(fieldErrors.email))}
            placeholder="name@yourschool.in"
          />
          <FieldError id="email-error">{fieldErrors.email}</FieldError>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link href="/forget-password" className={`text-xs ${textLinkClass}`}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              className={inputClass(Boolean(fieldErrors.password), "pr-11")}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>
          <FieldError id="password-error">{fieldErrors.password}</FieldError>
        </div>

        <button type="submit" disabled={isPending} className={`w-full ${primaryButtonClass}`}>
          {isPending && <Spinner />}
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">
        New to Classic Giga?{" "}
        <Link href="/register-school" className={textLinkClass}>
          Register your school
        </Link>
      </p>
    </PublicShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PublicLoading label="Loading sign-in…" />}>
      <LoginForm />
    </Suspense>
  );
}
