"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchModal } from "../common/GlobalSearchModal";
import type { ManagementContact } from "./topbar/ProfileMenu";

export interface SchoolLayoutClientProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  udiseCode?: string | null;
  management?: ManagementContact[];
  userName: string;
  userRole: string;
  userEmail: string;
  currentSession?: string;
  children: React.ReactNode;
}

export function SchoolLayoutClient({
  schoolSlug,
  schoolName,
  schoolCode,
  udiseCode,
  management = [],
  userName,
  userRole,
  userEmail,
  currentSession = "2026-27",
  children,
}: SchoolLayoutClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased">
      {/* 1. Full-width top bar */}
      <Header
        schoolSlug={schoolSlug}
        schoolName={schoolName}
        schoolCode={schoolCode}
        udiseCode={udiseCode}
        currentSession={currentSession}
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        management={management}
        onToggleMobileMenu={() => setIsMobileOpen(true)}
      />

      {/* 2. Sidebar below the top bar */}
      <Sidebar
        schoolSlug={schoolSlug}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        userRole={userRole}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* 3. Page content */}
      <div
        className={`flex min-w-0 flex-col pt-16 transition-[margin] duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global Search Dialog (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        schoolSlug={schoolSlug}
        userRole={userRole}
      />
    </div>
  );
}

export default SchoolLayoutClient;
