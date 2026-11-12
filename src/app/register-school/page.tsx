"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, Send, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/PublicShell";
import {
  Notice,
  PasswordToggle,
  Spinner,
  inputClass,
  labelClass,
  primaryButtonClass,
  textLinkClass,
} from "@/components/common/FormControls";
import { CLASS_RANGES } from "@/modules/onboarding/services/school-profile-rules";

const MEDIUMS = [
  { value: "ENGLISH", label: "English" },
  { value: "HINDI", label: "Hindi" },
  { value: "BILINGUAL", label: "Both" },
] as const;

const initialForm = {
  adminName: "",
  schoolName: "",
  udiseCode: "",
  classRange: "",
  hasPrePrimary: false,
  hasPlayGroup: false,
  medium: "ENGLISH",
  principalName: "",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

type FormState = typeof initialForm;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status}). Please try again.`);
  }
  return data?.data;
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
      <div>
        <p id={`${id}-label`} className="text-sm font-semibold text-slate-800">
          {label}
        </p>
        <p className="text-xs text-emerald-700">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex shrink-0 items-center gap-2 rounded-full text-xs font-semibold text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
      >
        <span
          className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
          />
        </span>
        <span className="w-6 text-left">{checked ? "Yes" : "No"}</span>
      </button>
    </div>
  );
}

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const run = (action: () => Promise<void>) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  const sendOtp = () =>
    run(async () => {
      if (form.password !== form.confirmPassword) throw new Error("Passwords do not match");
      const data = await postJson("/api/v1/public/register-school", form);
      setInfo(data?.message ?? `We sent a 6-digit code to ${form.email}.`);
      setOtp("");
      setStep("otp");
    });

  const verifyOtp = () =>
    run(async () => {
      const data = await postJson("/api/v1/public/register-school/verify", {
        email: form.email,
        otp,
      });
      router.push(`/school/${data.school.slug}`);
      router.refresh();
    });

  if (step === "otp") {
    return (
      <AuthShell active="register">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-lg font-black text-slate-900">
            <MailCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            Verify your email
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-800">{info}</p>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            verifyOtp();
          }}
        >
          {errorMessage && <Notice>{errorMessage}</Notice>}
          <div>
            <label htmlFor="otp" className={labelClass}>
              Enter OTP
            </label>
            <input
              id="otp"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              disabled={isPending}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6 digit code"
              className={inputClass(false, "text-center font-mono text-lg tracking-[0.5em]")}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className={`w-full ${primaryButtonClass}`}
          >
            {isPending ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {isPending ? "Verifying…" : "Verify & Register School"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setStep("form")}
              className={textLinkClass}
            >
              Edit details
            </button>
            <button type="button" disabled={isPending} onClick={sendOtp} className={textLinkClass}>
              Resend OTP
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  const textField = (
    key: "adminName" | "schoolName" | "principalName",
    label: string,
    placeholder: string,
    autoComplete?: string
  ) => (
    <div>
      <label htmlFor={key} className={labelClass}>
        {label}
      </label>
      <input
        id={key}
        type="text"
        required
        autoComplete={autoComplete}
        disabled={isPending}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={inputClass()}
      />
    </div>
  );

  return (
    <AuthShell active="register">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <h1 className="text-lg font-black text-slate-900">Register Your School</h1>
        <p className="mt-1 text-xs font-medium text-emerald-800">
          Register now for instant access to your school dashboard.
        </p>
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          sendOtp();
        }}
      >
        {errorMessage && <Notice title="We couldn’t continue">{errorMessage}</Notice>}

        {textField("adminName", "Admin Name", "Your full name", "name")}
        {textField("schoolName", "School Name", "e.g. Sunrise Public School", "organization")}

        <div>
          <label htmlFor="udiseCode" className={labelClass}>
            U-DISE+ Code
          </label>
          <input
            id="udiseCode"
            required
            inputMode="numeric"
            maxLength={11}
            disabled={isPending}
            value={form.udiseCode}
            onChange={(e) => set("udiseCode", e.target.value.replace(/\D/g, ""))}
            placeholder="11 digit U-DISE+ code"
            className={inputClass(false, "font-mono")}
          />
        </div>

        <div>
          <label htmlFor="classRange" className={labelClass}>
            Select Class Range
          </label>
          <select
            id="classRange"
            required
            disabled={isPending}
            value={form.classRange}
            onChange={(e) => set("classRange", e.target.value)}
            className={inputClass()}
          >
            <option value="" disabled>
              Select class range
            </option>
            {CLASS_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <ToggleRow
          id="hasPrePrimary"
          label="Has Pre-Primary Section?"
          hint="(Nursery, LKG, UKG)"
          checked={form.hasPrePrimary}
          disabled={isPending}
          onChange={(v) => set("hasPrePrimary", v)}
        />
        <ToggleRow
          id="hasPlayGroup"
          label="Has Play Group / Playway?"
          hint="(Toddler Care)"
          checked={form.hasPlayGroup}
          disabled={isPending}
          onChange={(v) => set("hasPlayGroup", v)}
        />

        <fieldset>
          <legend className={labelClass}>Medium</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 px-4 py-2.5">
            {MEDIUMS.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="medium"
                  value={m.value}
                  disabled={isPending}
                  checked={form.medium === m.value}
                  onChange={() => set("medium", m.value)}
                  className="h-4 w-4 accent-emerald-700"
                />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>

        {textField("principalName", "Principal Name", "Principal name")}

        <div>
          <label htmlFor="mobile" className={labelClass}>
            Mobile Number
          </label>
          <div className="mt-1.5 flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
              +91
            </span>
            <input
              id="mobile"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              disabled={isPending}
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              placeholder="10 digit mobile"
              className={inputClass(false, "mt-0 rounded-l-none")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isPending}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="Verified account email"
            className={inputClass()}
          />
        </div>

        {(["password", "confirmPassword"] as const).map((key) => (
          <div key={key}>
            <label htmlFor={key} className={labelClass}>
              {key === "password" ? "Password" : "Confirm Password"}
            </label>
            <div className="relative">
              <input
                id={key}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                disabled={isPending}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                aria-describedby={key === "password" ? "password-hint" : undefined}
                className={inputClass(false, "pr-11")}
              />
              <PasswordToggle
                shown={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            </div>
            {key === "password" && (
              <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
                At least 8 characters, with one uppercase letter and one number.
              </p>
            )}
          </div>
        ))}

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            required
            disabled={isPending}
            checked={form.acceptTerms}
            onChange={(e) => set("acceptTerms", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-700"
          />
          <span>
            I agree to the{" "}
            <span className="font-semibold text-emerald-700">Terms &amp; Conditions</span> &amp;{" "}
            <span className="font-semibold text-emerald-700">Privacy Policy</span>
          </span>
        </label>

        <button type="submit" disabled={isPending} className={`w-full ${primaryButtonClass}`}>
          {isPending ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {isPending ? "Sending OTP…" : "Send OTP & Verify Email"}
        </button>
      </form>
    </AuthShell>
  );
}
