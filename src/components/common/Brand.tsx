import React from "react";
import { BookOpen } from "lucide-react";

/** Flat Register Green emblem. Size follows the surrounding layout. */
export function BrandEmblem({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const icon = size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white`}
    >
      <BookOpen className={icon} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

export function BrandWordmark() {
  return (
    <span className="text-lg leading-none font-extrabold tracking-tight whitespace-nowrap text-slate-900">
      Classic <span className="text-emerald-700">Giga</span>
    </span>
  );
}
