import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "emerald" | "boy" | "girl" | "alert" | "rte";
  badgeText?: string;
  badgeColor?: string;
  /** Renders the whole card as a link that opens the related page. */
  href?: string;
  onClick?: () => void;
  extraContent?: React.ReactNode;
  className?: string;
}

const interactiveStyles =
  "hover:shadow-card-hover cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  badgeText,
  badgeColor,
  href,
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

  const interactive = Boolean(onClick || href);
  const cardClassName = `shadow-card relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-800 transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
    interactive ? interactiveStyles : ""
  } ${className}`;

  const body = (
    <>
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
                  badgeColor || "border border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs leading-relaxed font-medium text-slate-500">{subtitle}</p>
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
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {body}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cardClassName}
    >
      {body}
    </div>
  );
}

export default StatCard;
