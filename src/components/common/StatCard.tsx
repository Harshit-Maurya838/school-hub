import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "emerald" | "boy" | "girl" | "alert" | "rte";
  badgeText?: string;
  badgeColor?: string;
  onClick?: () => void;
  extraContent?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  badgeText,
  badgeColor,
  onClick,
  extraContent,
  className = "",
}: StatCardProps) {
  // Cards stay plain white sheets; the variant only tints the icon tile.
  const iconStyles = {
    default: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    boy: "bg-sky-50 text-sky-700",
    girl: "bg-pink-50 text-pink-700",
    alert: "bg-amber-50 text-amber-700",
    rte: "bg-emerald-50 text-emerald-700",
  };

  const interactive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`shadow-card relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-800 transition-[transform,box-shadow,border-color] duration-200 ${
        interactive
          ? "hover:shadow-card-hover cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-sans text-2xl font-black tracking-tight text-slate-900 tabular-nums">
              {value}
            </p>
            {badgeText && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  badgeColor || "bg-emerald-50 text-emerald-700"
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="truncate text-xs leading-relaxed font-medium text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              iconStyles[variant] || iconStyles.default
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </div>
        )}
      </div>

      {extraContent && <div className="mt-4 border-t border-slate-100/80 pt-3">{extraContent}</div>}
    </div>
  );
}

export default StatCard;
