"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchModal } from "../common/GlobalSearchModal";

export interface SchoolLayoutClientProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
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
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased">
      {/* 1. Collapsible & Responsive Sidebar */}
      <Sidebar
        schoolSlug={schoolSlug}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        session={currentSession}
        userRole={userRole}
      />

      {/* 2. Main Content Shell */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Top Header Bar */}
        <Header
          schoolSlug={schoolSlug}
          schoolName={schoolName}
          schoolCode={schoolCode}
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileMenu={() => setIsMobileOpen(true)}
        />

        {/* Page Content Viewport */}
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
