"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, PencilLine, Send } from "lucide-react";
import { AuthPanelHeader, authPrimaryButtonClass } from "@/components/layout/PublicShell";
import { Notice, Spinner, textLinkClass } from "@/components/common/FormControls";
import { Input } from "@/components/hairline/input";
import { PasswordInput } from "@/components/hairline/password-input";
import { Select } from "@/components/hairline/select";
import { Switch } from "@/components/hairline/switch";
import { Checkbox } from "@/components/hairline/checkbox";
import { SegmentedControl } from "@/components/hairline/segmented-control";
import { CodeInput } from "@/components/hairline/code-input";
import {
  classRangeOptions,
  isPreschoolRange,
  sectionsForRange,
} from "../services/school-profile-rules";

const CLASS_RANGE_OPTIONS = classRangeOptions();

const MEDIUM_OPTIONS = [
  { value: "ENGLISH", label: "English" },
  { value: "HINDI", label: "Hindi" },
  { value: "BILINGUAL", label: "Both" },
];

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
type FieldErrors = Partial<Record<keyof FormState, string>>;

/** Mirrors the server rules so mistakes show beside the field before a round trip. */
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.adminName.trim().length < 2) errors.adminName = "Enter your full name";
  if (form.schoolName.trim().length < 2) errors.schoolName = "Enter the school's name";
  if (!/^\d{11}$/.test(form.udiseCode)) errors.udiseCode = "U-DISE+ code is 11 digits";
  if (!form.classRange) errors.classRange = "Choose the classes your school runs";
  if (form.principalName.trim().length < 2) errors.principalName = "Enter the principal's name";
  if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = "Enter a 10 digit mobile number";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email";
  if (
    form.password.length < 8 ||
    form.password.length > 72 ||
    !/[A-Z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    errors.password = "Use 8 or more characters with an uppercase letter and a number";
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match";
  if (!form.acceptTerms) errors.acceptTerms = "Accept the terms to continue";
  return errors;
}

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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `section-${title.toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 border-t border-slate-100 pt-6 first:border-t-0 first:pt-0"
    >
      <h2 id={id} className="text-base font-bold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Self-registration: school details and admin password, then the emailed OTP. */
export function RegisterSchoolForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"form" | "otp">("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const sectionsFixed = isPreschoolRange(form.classRange);

  // A range turns the preschool switches on or off to match it; Class 1 ranges keep them
  // editable, starting off when the previous range had fixed them.
  const chooseClassRange = (value: string) => {
    const sections = sectionsForRange(
      value,
      sectionsFixed
        ? { prePrimary: false, playGroup: false }
        : { prePrimary: form.hasPrePrimary, playGroup: form.hasPlayGroup }
    );
    setForm((prev) => ({
      ...prev,
      classRange: value,
      hasPrePrimary: sections.prePrimary,
      hasPlayGroup: sections.playGroup,
    }));
    if (errors.classRange) setErrors((prev) => ({ ...prev, classRange: undefined }));
  };

  const requestOtp = () => postJson("/api/v1/public/register-school", form);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    startTransition(async () => {
      try {
        await requestOtp();
        setStep("otp");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  if (step === "otp") {
    return (
      <>
        <AuthPanelHeader
          title="Verify your email"
          description={
            <>
              We sent a 6-digit code to{" "}
              <span className="font-semibold break-all text-slate-900">{form.email}</span>. It
              expires in 10 minutes.
            </>
          }
        />
        <div className="space-y-6">
          {errorMessage && <Notice>{errorMessage}</Notice>}
          <CodeInput
            autoFocus
            groups={[3, 3]}
            label="Enter the code from your email"
            onComplete={async (otp) => {
              setErrorMessage(null);
              try {
                const data = await postJson("/api/v1/public/register-school/verify", {
                  email: form.email,
                  otp,
                });
                // Let "Verified" land before leaving the page.
                window.setTimeout(() => {
                  router.push(`/school/${data.school.slug}`);
                  router.refresh();
                }, 900);
                return true;
              } catch (err) {
                const message = err instanceof Error ? err.message : "";
                // A wrong code is shown by the boxes; anything else needs words.
                if (!/^Incorrect OTP/.test(message)) setErrorMessage(message);
                return false;
              }
            }}
            onResend={async () => {
              setErrorMessage(null);
              await requestOtp();
            }}
          />
          <div className="flex items-center gap-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
            <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Wrong email or details?
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStep("form");
              }}
              className={`inline-flex items-center gap-1 ${textLinkClass}`}
            >
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
              Edit details
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthPanelHeader
        title="Register your school"
        description="Fill in your school's details and verify your email. Your dashboard opens as soon as the code checks out."
      />
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        {errorMessage && <Notice title="We couldn’t send the code">{errorMessage}</Notice>}

        <FormSection title="School">
          <Input
            id="schoolName"
            label="School name"
            required
            autoComplete="organization"
            disabled={isPending}
            value={form.schoolName}
            onValueChange={(v) => set("schoolName", v)}
            error={errors.schoolName}
            placeholder="e.g. Sunrise Public School"
          />
          <Input
            id="udiseCode"
            label="U-DISE+ code"
            required
            inputMode="numeric"
            maxLength={11}
            disabled={isPending}
            value={form.udiseCode}
            onValueChange={(v) => set("udiseCode", v.replace(/\D/g, ""))}
            error={errors.udiseCode}
            placeholder="11 digits"
            inputClassName="font-mono tabular-nums placeholder:font-sans"
          />
          <Select
            id="classRange"
            label="Select class range"
            options={CLASS_RANGE_OPTIONS}
            placeholder="Choose the classes your school runs"
            disabled={isPending}
            value={form.classRange || null}
            onValueChange={chooseClassRange}
            error={errors.classRange}
          />

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
            <div className="py-3.5">
              <Switch
                label="Pre-primary section"
                description={sectionsFixed ? "Set by the class range" : "Nursery, LKG and UKG"}
                labelPosition="start"
                className="w-full"
                disabled={isPending || sectionsFixed}
                checked={form.hasPrePrimary}
                onCheckedChange={(v) => set("hasPrePrimary", v)}
              />
            </div>
            <div className="py-3.5">
              <Switch
                label="Play group / playway"
                description={
                  sectionsFixed ? "Set by the class range" : "Toddler care before nursery"
                }
                labelPosition="start"
                className="w-full"
                disabled={isPending || sectionsFixed}
                checked={form.hasPlayGroup}
                onCheckedChange={(v) => set("hasPlayGroup", v)}
              />
            </div>
          </div>

          <div>
            <p aria-hidden="true" className="px-3 pb-1.5 text-[13px] font-medium text-slate-900">
              Medium of instruction
            </p>
            <SegmentedControl
              label="Medium of instruction"
              options={MEDIUM_OPTIONS}
              value={form.medium}
              onValueChange={(v) => set("medium", v)}
              block
            />
          </div>
        </FormSection>

        <FormSection title="People">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="adminName"
              label="Admin name"
              required
              autoComplete="name"
              disabled={isPending}
              value={form.adminName}
              onValueChange={(v) => set("adminName", v)}
              error={errors.adminName}
              placeholder="Your full name"
            />
            <Input
              id="principalName"
              label="Principal name"
              required
              disabled={isPending}
              value={form.principalName}
              onValueChange={(v) => set("principalName", v)}
              error={errors.principalName}
              placeholder="Principal's full name"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="mobile"
              type="tel"
              label="Mobile number"
              required
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              disabled={isPending}
              value={form.mobile}
              leading={<span className="text-[13px] font-semibold text-slate-700">+91</span>}
              onValueChange={(v) => set("mobile", v.replace(/\D/g, ""))}
              error={errors.mobile}
              placeholder="10 digit mobile"
              inputClassName="tabular-nums"
            />
            <Input
              id="email"
              type="email"
              label="Email"
              required
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={isPending}
              value={form.email}
              onValueChange={(v) => set("email", v)}
              error={errors.email}
              placeholder="you@yourschool.in"
            />
          </div>
        </FormSection>

        <FormSection title="Password">
          <div className="space-y-4">
            <PasswordInput
              id="password"
              label="Password"
              strength
              required
              autoComplete="new-password"
              disabled={isPending}
              value={form.password}
              onValueChange={(v) => set("password", v)}
              error={errors.password}
              hint="8+ characters, an uppercase letter and a number"
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              required
              autoComplete="new-password"
              disabled={isPending}
              value={form.confirmPassword}
              onValueChange={(v) => set("confirmPassword", v)}
              error={errors.confirmPassword}
            />
          </div>
        </FormSection>

        <div className="space-y-5 border-t border-slate-100 pt-6">
          <div>
            <Checkbox
              label="I agree to the Terms & Conditions and Privacy Policy"
              disabled={isPending}
              checked={form.acceptTerms}
              onCheckedChange={(v) => set("acceptTerms", v)}
              aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            />
            {errors.acceptTerms && (
              <p id="acceptTerms-error" className="mt-1.5 pl-7 text-[12.5px] text-rose-700">
                {errors.acceptTerms}
              </p>
            )}
          </div>

          <button type="submit" disabled={isPending} className={authPrimaryButtonClass}>
            {isPending ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {isPending ? "Sending code…" : "Send OTP & verify email"}
          </button>
        </div>
      </form>
    </>
  );
}
