"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Mail } from "lucide-react";
import { AuthShell, authPrimaryButtonClass } from "@/components/layout/PublicShell";
import { Input } from "@/components/hairline/input";
import { PasswordInput } from "@/components/hairline/password-input";
import { Notice, PublicLoading, Spinner, textLinkClass } from "@/components/common/FormControls";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <AuthShell
      active="login"
      title="Sign in"
      description="Use the email your school registered or invited you with."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {errorMessage && <Notice>{errorMessage}</Notice>}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={isPending}
          value={email}
          leading={<Mail aria-hidden="true" />}
          onValueChange={(v) => {
            setEmail(v);
            if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
          }}
          error={fieldErrors.email}
          placeholder="name@yourschool.in"
        />

        <div>
          <PasswordInput
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            required
            disabled={isPending}
            value={password}
            onValueChange={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            error={fieldErrors.password}
          />
          <div className="mt-2 flex justify-end px-3">
            <Link href="/forget-password" className={`text-xs ${textLinkClass}`}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={isPending} className={authPrimaryButtonClass}>
          {isPending ? <Spinner /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PublicLoading label="Loading sign-in…" />}>
      <LoginForm />
    </Suspense>
  );
}
