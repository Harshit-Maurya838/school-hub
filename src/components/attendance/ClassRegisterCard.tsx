"use client";

import React from "react";
import { UserCheck, ChevronRight } from "lucide-react";

export interface ClassRegisterItem {
  id: string;
  name: string;
  section?: string;
  studentCount: number;
  sectionsCount?: number;
}

interface ClassRegisterCardProps {
  classItem: ClassRegisterItem;
  session?: string;
  onClick?: () => void;
}

export function ClassRegisterCard({
  classItem,
  session = "2026-27",
  onClick,
}: ClassRegisterCardProps) {
  const rings = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      onClick={onClick}
      className="register-notebook group flex cursor-pointer overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-xs transition-all duration-300 hover:border-emerald-700/30"
    >
      {/* Dark Green Leather-style binding spine with rings */}
      <div className="register-spine relative flex w-12 shrink-0 flex-col items-center justify-between py-4 sm:w-14">
        {/* Embossed gold border line along spine */}
        <div className="absolute top-0 right-1 bottom-0 w-[1px] bg-emerald-400/30" />

        {/* Ring holes and metallic rings */}
        <div className="flex h-full w-full flex-col items-center justify-around space-y-3 py-2">
          {rings.map((r) => (
            <div key={r} className="relative flex w-full items-center justify-center">
              {/* Spine hole punch */}
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-950/80 shadow-inner" />
              {/* Metallic Ring */}
              <div className="spiral-ring absolute -right-2 h-2 w-5 -rotate-6 transform rounded-full border border-slate-400/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Cream-colored center page */}
      <div className="relative flex flex-1 flex-col justify-between bg-[#FFFDF7] p-4 sm:p-5">
        {/* Subtle lined paper rule watermark */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#f1eee6_1px,transparent_1px)] bg-[size:100%_28px] opacity-40" />

        <div className="relative z-10">
          {/* Header Seal / Badge */}
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-2">
            <span className="font-serif text-[10px] font-black tracking-widest text-emerald-900 uppercase">
              ATTENDANCE REGISTER
            </span>
            <span className="rounded border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              {session}
            </span>
          </div>

          {/* Class Title */}
          <div className="mt-3">
            <h3 className="font-serif text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-emerald-900 sm:text-2xl">
              {classItem.name}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-emerald-800">
              {classItem.section ? `Section - ${classItem.section} • ` : ""}
              {classItem.studentCount} Students Enrolled
            </p>
          </div>
        </div>

        {/* Attendance status banner */}
        <div className="relative z-10 mt-5 flex items-center justify-between border-t border-amber-900/10 pt-3">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Roster Status
            </p>
            <p className="truncate text-xs font-bold text-slate-800">
              {classItem.studentCount > 0 ? "Class Active" : "Empty Roster"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs">
            <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Open Register</span>
            <ChevronRight className="h-3.5 w-3.5 text-emerald-600 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
export default ClassRegisterCard;
