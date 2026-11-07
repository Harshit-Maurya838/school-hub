"use client";

import { Printer } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/common/FormControls";

/** Screen-only toolbar for the printable school profile. */
export function PrintProfileActions({ backHref }: { backHref: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <a href={backHref} className={secondaryButtonClass}>
        Back to settings
      </a>
      <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        Print / Save as PDF
      </button>
    </div>
  );
}
