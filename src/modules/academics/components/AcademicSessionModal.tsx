"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { AcademicSessionsClient, type AcademicYearData } from "./AcademicSessionsClient";

interface Props {
  schoolSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Academic session setup as a popup, loading the years each time it opens. */
export function AcademicSessionModal({ schoolSlug, isOpen, onClose }: Props) {
  const [years, setYears] = useState<AcademicYearData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`/api/v1/school/${schoolSlug}/academics/years`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Could not load academic sessions.");
        if (!cancelled) setYears(body.data.academicYears);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
      setYears(null);
      setError(null);
    };
  }, [isOpen, schoolSlug]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Academic Session" maxWidth="max-w-4xl">
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : years ? (
        <AcademicSessionsClient schoolSlug={schoolSlug} initialYears={years} />
      ) : (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading sessions…
        </div>
      )}
    </Modal>
  );
}
