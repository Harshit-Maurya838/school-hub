import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "emerald"
    | "compulsory"
    | "co_scholastic"
    | "boy"
    | "girl"
    | "alert"
    | "rte"
    | "paid"
    | "partial"
    | "due";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Badge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    compulsory: "bg-teal-50 text-teal-700 border-teal-200",
    co_scholastic: "bg-slate-100 text-slate-700 border-slate-200",
    boy: "bg-sky-50 text-sky-700 border-sky-200",
    girl: "bg-pink-50 text-pink-700 border-pink-200",
    alert: "bg-amber-50 text-amber-700 border-amber-200",
    rte: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    partial: "bg-amber-100 text-amber-800 border-amber-200",
    due: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 font-medium",
    md: "text-xs px-2.5 py-1 font-semibold",
    lg: "text-sm px-3 py-1.5 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${
        variantStyles[variant] || variantStyles.default
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
