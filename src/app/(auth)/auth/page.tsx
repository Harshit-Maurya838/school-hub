import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth";
import { RegisterSchoolForm } from "@/modules/onboarding";
import { AuthScreen } from "./AuthScreen";

export const metadata: Metadata = {
  title: "Sign in or register your school",
  description:
    "Sign in to Academix AI, or register your school and verify your email to open your school dashboard.",
};

export default async function AuthPage(props: PageProps<"/auth">) {
  const { tab } = await props.searchParams;
  return (
    <AuthScreen
      initialTab={tab === "register" ? "register" : "login"}
      login={
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      }
      register={<RegisterSchoolForm />}
    />
  );
}
