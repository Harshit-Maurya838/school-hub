import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Users,
  Play,
  Building,
  School,
} from "lucide-react";

export interface HeroSectionProps {
  userDestination?: string;
  isLoggedIn?: boolean;
}

export function HeroSection({ userDestination = "/login", isLoggedIn = false }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background glow meshes */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="absolute top-1/4 h-[500px] w-[650px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-20 h-[450px] w-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute top-1/2 -left-20 h-[350px] w-[450px] rounded-full bg-teal-500/10 blur-[120px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-1.5 text-xs font-semibold text-emerald-400 shadow-inner backdrop-blur-md transition-transform hover:scale-105">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>Next-Gen Multi-Tenant School OS</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">100% Tenant-Isolated Architecture</span>
          </div>

          {/* Main Title */}
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.12]">
            The Intelligent Operating System for{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Modern Schools
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-base text-zinc-300 sm:text-lg sm:leading-relaxed">
            Eliminate fragmented software and paperwork. CampusPulse unifies student admissions,
            30-second digital attendance registers, automated fee collections, and examination
            gradebooks with institutional-grade security.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href={userDestination}
                className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-102 hover:brightness-110 active:scale-98"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register-school"
                  className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-102 hover:shadow-emerald-500/35 active:scale-98"
                >
                  <Sparkles className="h-4 w-4 text-emerald-200" />
                  Register Your School
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#demo"
                  className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-6 py-3.5 text-sm font-semibold text-zinc-200 shadow-sm backdrop-blur-md transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                >
                  <Play className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                  Explore Live Demo
                </a>

                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-xl border border-transparent px-4 py-3.5 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
                >
                  Sign In to Portal
                </Link>
              </>
            )}
          </div>

          {/* Micro trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              14-Day Free Sandbox Trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Instant Dedicated Tenant Provisioning
            </span>
          </div>

          {/* Highlights summary bar */}
          <div className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl sm:grid-cols-4">
            <div className="flex flex-col items-center justify-center border-b border-zinc-800/60 pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
              <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                1.2M+
              </div>
              <span className="mt-1 text-xs text-zinc-400">Students Managed</span>
            </div>

            <div className="flex flex-col items-center justify-center border-b border-zinc-800/60 pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
              <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-emerald-400 sm:text-3xl">
                99.99%
              </div>
              <span className="mt-1 text-xs text-zinc-400">Platform SLA</span>
            </div>

            <div className="flex flex-col items-center justify-center border-b border-zinc-800/60 pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
              <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                40 hrs
              </div>
              <span className="mt-1 text-xs text-zinc-400">Monthly Time Saved/School</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-indigo-400 sm:text-3xl">
                100%
              </div>
              <span className="mt-1 text-xs text-zinc-400">Multi-Tenant Isolation</span>
            </div>
          </div>

          {/* Social Proof Institutional Trust Banner */}
          <div className="mt-14 w-full max-w-5xl">
            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Trusted by 1,200+ innovative institutions, school trusts, and collegiate academies
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-80 transition-opacity hover:opacity-100">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <School className="h-4 w-4 text-emerald-400" />
                Oakridge Global Academy
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <Building className="h-4 w-4 text-indigo-400" />
                Cambridge Heights International
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <GraduationCap className="h-4 w-4 text-teal-400" />
                Horizon STEM Preparatory
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                St. Jude’s Educational Trust
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-300">
                <Users className="h-4 w-4 text-rose-400" />
                Apex Montessori Guild
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
