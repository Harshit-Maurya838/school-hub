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
  const variantStyles = {
    default: "bg-white border-slate-200/80 text-slate-800 shadow-xs hover:border-slate-300",
    emerald:
      "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200/80 text-slate-900 shadow-xs",
    boy: "bg-gradient-to-br from-[#E0F2FE] via-white to-[#F0F9FF] border-sky-200/80 text-slate-900 shadow-xs",
    girl: "bg-gradient-to-br from-[#FCE7F3] via-white to-[#FDF2F8] border-pink-200/80 text-slate-900 shadow-xs",
    alert:
      "bg-gradient-to-br from-[#FEF3C7] via-white to-[#FFFBEB] border-amber-200/80 text-slate-900 shadow-xs",
    rte: "bg-gradient-to-br from-[#D1FAE5] via-white to-[#ECFDF5] border-emerald-200/90 text-slate-900 shadow-xs",
  };

  const iconStyles = {
    default: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-600 text-white shadow-xs shadow-emerald-200",
    boy: "bg-sky-500 text-white shadow-xs shadow-sky-200",
    girl: "bg-pink-500 text-white shadow-xs shadow-pink-200",
    alert: "bg-amber-500 text-white shadow-xs shadow-amber-200",
    rte: "bg-emerald-600 text-white shadow-xs shadow-emerald-200",
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
        variantStyles[variant] || variantStyles.default
      } ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-sans text-2xl font-black tracking-tight text-slate-900">{value}</h3>
            {badgeText && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  badgeColor || "bg-emerald-100 text-emerald-800"
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
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
      </div>

      {extraContent && <div className="mt-4 border-t border-slate-100/80 pt-3">{extraContent}</div>}
    </div>
  );
}

export default StatCard;
