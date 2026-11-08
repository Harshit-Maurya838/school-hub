"use client";

import React, { useId, useRef, useState } from "react";
import Link from "next/link";
import { ListChecks, Cake, CheckCircle2, AlertTriangle, CircleDot, ArrowRight } from "lucide-react";

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
  isToday?: boolean;
}

export interface DashboardActivityCardProps {
  reminders: ReminderItem[];
  birthdays: BirthdayItem[];
  /** Total birthdays this month; the list itself may be capped. */
  birthdaysTotal?: number;
  /** Supporting line when there is nothing to do. */
  allClearMessage?: string;
}

type TabKey = "reminders" | "birthdays";

export function DashboardActivityCard({
  reminders = [],
  birthdays = [],
  birthdaysTotal,
  allClearMessage = "Nothing is waiting on you right now.",
}: DashboardActivityCardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("reminders");
  const baseId = useId();
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    reminders: null,
    birthdays: null,
  });
  const birthdayCount = birthdaysTotal ?? birthdays.length;

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Cake }[] = [
    { key: "reminders", label: "To do", count: reminders.length, icon: ListChecks },
    { key: "birthdays", label: "Birthdays", count: birthdayCount, icon: Cake },
  ];

  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next: TabKey = activeTab === "reminders" ? "birthdays" : "reminders";
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-label="To do and birthdays"
      className="shadow-card flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5"
    >
      <div className="border-b border-slate-100 pb-3">
        <div
          role="tablist"
          aria-label="Activity"
          className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1"
        >
          {tabs.map(({ key, label, count, icon: Icon }) => {
            const selected = activeTab === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(key)}
                onKeyDown={onTabKeyDown}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                  selected
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 font-mono text-[10px] ${
                    selected ? "bg-emerald-50 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        className="mt-3 max-h-72 flex-1 overflow-y-auto pr-1"
      >
        {activeTab === "reminders" ? (
          reminders.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-800">Nothing needs your attention</p>
              <p className="max-w-60 text-xs text-slate-500">{allClearMessage}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {reminders.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      {r.priority === "high" ? (
                        <AlertTriangle
                          className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <CircleDot
                          className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs leading-snug font-bold text-slate-900">{r.title}</p>
                        <p className="text-xs leading-snug text-slate-600">{r.description}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        r.priority === "high"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {r.priority === "high" ? "Action needed" : "Next step"}
                    </span>
                  </div>
                  {r.actionUrl && (
                    <Link
                      href={r.actionUrl}
                      className="mt-2 ml-5.5 inline-flex items-center gap-1 rounded text-xs font-bold text-emerald-700 underline-offset-2 hover:text-emerald-800 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                    >
                      {r.actionLabel || "Open"}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : birthdays.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <Cake className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-800">No birthdays this month</p>
            <p className="max-w-60 text-xs text-slate-500">
              Birthdays come from the date of birth on each student&apos;s admission record.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {birthdays.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
                    aria-hidden="true"
                  >
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{b.name}</p>
                    {b.className && (
                      <p className="truncate text-xs text-slate-500">{b.className}</p>
                    )}
                  </div>
                </div>
                {b.isToday ? (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    Today
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">
                    {b.dobFormatted}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {activeTab === "birthdays" && birthdayCount > birthdays.length && (
          <p className="pt-2 text-center text-xs text-slate-500">
            Showing {birthdays.length} of {birthdayCount} birthdays this month
          </p>
        )}
      </div>
    </section>
  );
}

export default DashboardActivityCard;
