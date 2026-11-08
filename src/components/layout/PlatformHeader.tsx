"use client";

import React from "react";
import Link from "next/link";
import { BrandEmblem } from "@/components/common/Brand";
import {
  CalculatorTool,
  CalendarTool,
  LanguageTool,
  LogoutIconButton,
  focusRing,
} from "./topbar/TopBarWidgets";
import { ProfileMenu } from "./topbar/ProfileMenu";

export interface PlatformHeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
}

/** Platform console top bar: same structure as the school bar, without a school context. */
export function PlatformHeader({ userName, userEmail, userRole }: PlatformHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-md sm:px-5">
      <Link href="/platform" className={`flex min-w-0 items-center gap-3 rounded-xl ${focusRing}`}>
        <BrandEmblem size="lg" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-black tracking-tight text-slate-900 uppercase sm:text-base">
            Classic <span className="text-emerald-700">Giga</span>
          </span>
          <span className="truncate font-mono text-[11px] text-slate-500">Platform console</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <CalculatorTool className="hidden sm:block" />
        <CalendarTool className="hidden sm:block" />
        <LanguageTool />
        <ProfileMenu userName={userName} userEmail={userEmail} userRole={userRole} />
        <LogoutIconButton />
      </div>
    </header>
  );
}

export default PlatformHeader;
