"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, Cake, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export interface ReminderItem {
  id: string;
  title: string;
  description: string;
  priority: "high" | "normal" | "low";
  actionUrl?: string;
  actionLabel?: string;
}

export interface BirthdayItem {
  id: string;
  name: string;
  dobFormatted: string;
  className?: string;
}

export interface DashboardActivityCardProps {
  reminders: ReminderItem[];
  birthdays: BirthdayItem[];
}

export function DashboardActivityCard({
  reminders = [],
  birthdays = [],
}: DashboardActivityCardProps) {
  const [activeTab, setActiveTab] = useState<"reminders" | "birthdays">("reminders");

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header Tabs */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("reminders")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                activeTab === "reminders"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Setup Actions</span>
              <span className="py-0.2 rounded-full bg-emerald-100 px-1.5 font-mono text-[10px] text-emerald-800">
                {reminders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("birthdays")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                activeTab === "birthdays"
                  ? "bg-white text-pink-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cake className="h-3.5 w-3.5 text-pink-500" />
              <span>Birthdays</span>
              <span className="py-0.2 rounded-full bg-pink-100 px-1.5 font-mono text-[10px] text-pink-700">
                {birthdays.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
          {activeTab === "reminders" ? (
            reminders.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500 opacity-80" />
                <p className="text-xs font-bold text-slate-800">All Setup Milestones Completed!</p>
                <p className="text-[11px] text-slate-500">
                  School profile, academic year, and roster prerequisites are fully ready.
                </p>
              </div>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {r.priority === "high" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                        <p className="text-xs leading-snug font-bold text-slate-900">{r.title}</p>
                      </div>
                      <p className="pl-5 text-[11px] leading-snug text-slate-500">
                        {r.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                        r.priority === "high"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {r.priority === "high" ? "Action Needed" : "Milestone"}
                    </span>
                  </div>
                  {r.actionUrl && (
                    <div className="mt-2 pl-5">
                      <Link
                        href={r.actionUrl}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        <span>{r.actionLabel || "Configure now"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )
          ) : birthdays.length === 0 ? (
            <div className="py-8 text-center">
              <Cake className="mx-auto mb-2 h-10 w-10 text-pink-300 opacity-60" />
              <p className="text-xs font-bold text-slate-800">No birthdays this month</p>
              <p className="text-[11px] text-slate-400">
                Student birthdays are calculated from official admission records.
              </p>
            </div>
          ) : (
            birthdays.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500 text-xs font-bold text-white shadow-xs">
                    {b.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{b.name}</p>
                    <p className="text-[11px] font-medium text-pink-700">
                      {b.className ? `${b.className} • ` : ""}
                      {b.dobFormatted}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-pink-200 bg-white px-2.5 py-1 text-[11px] font-bold text-pink-700">
                  Birthday 🎂
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-2 border-t border-slate-100 pt-3 text-center">
        <span className="text-[11px] text-slate-400">
          Powered by host readiness diagnostics & student database
        </span>
      </div>
    </div>
  );
}

export default DashboardActivityCard;
