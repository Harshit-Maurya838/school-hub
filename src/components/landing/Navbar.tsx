"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  ArrowRight,
} from "lucide-react";

export interface NavbarProps {
  user?: {
    id: string;
    name: string;
    role: string;
    email?: string | null;
  } | null;
  dashboardHref?: string;
}

export function Navbar({ user, dashboardHref = "/school" }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const targetDashboardHref =
    user?.role === "SUPER_ADMIN" ? "/platform" : dashboardHref || "/school";

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Interactive Demo", href: "#demo" },
    { label: "Solutions", href: "#solutions" },
    { label: "Security & Trust", href: "#security" },
    { label: "ROI Calculator", href: "#calculator" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-zinc-800/80 bg-zinc-950/85 shadow-lg shadow-black/40 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-md shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <GraduationCap className="h-5 w-5 text-emerald-400 transition-colors group-hover:text-emerald-300" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Campus<span className="text-emerald-400">Pulse</span>
              </span>
              <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 sm:inline-block">
                v2.4 LTS
              </span>
            </div>
            <span className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
              School Operating System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-4 py-1.5 backdrop-blur-md lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-xs font-semibold text-white">{user.name}</p>
                <p className="font-mono text-[10px] text-zinc-400">{user.role}</p>
              </div>
              <Link
                href={targetDashboardHref}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              >
                <LogIn className="h-3.5 w-3.5 text-zinc-400" />
                Sign In
              </Link>
              <Link
                href="/register-school"
                className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-102 hover:shadow-emerald-500/30"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                  Register School
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 sm:hidden">
          {user && (
            <Link
              href={targetDashboardHref}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Dashboard
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-800 bg-zinc-950/95 px-4 pt-3 pb-6 backdrop-blur-2xl sm:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800 pt-4">
            {user ? (
              <Link
                href={targetDashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                Access Dashboard ({user.role})
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-center text-sm font-medium text-zinc-200"
                >
                  Sign In to Portal
                </Link>
                <Link
                  href="/register-school"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 py-2.5 text-center text-sm font-semibold text-white shadow-md"
                >
                  <Sparkles className="h-4 w-4" />
                  Register School (14-Day Free Trial)
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
