"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";

export interface SerializedRegistration {
  id: string;
  schoolName: string;
  schoolCode: string;
  desiredSlug: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string | null;
  status: "PENDING_VERIFICATION" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | string;
  emailVerifiedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  schoolId: string | null;
  school?: { slug: string } | null;
  createdAt: string;
}

interface PlatformRegistrationsRosterProps {
  initialRegistrations: SerializedRegistration[];
  /** How many of the most recent registrations the server sent. */
  limit?: number;
}

const STATUS_META: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]>; description: string }
> = {
  PENDING_VERIFICATION: {
    label: "Awaiting email verification",
    variant: "alert",
    description:
      "The applicant has not verified their email address yet. You can still approve this school manually if required.",
  },
  PENDING_REVIEW: {
    label: "Ready for review",
    variant: "alert",
    description:
      "The applicant administrator has verified their email address. The application is ready for approval.",
  },
  APPROVED: {
    label: "Approved",
    variant: "emerald",
    description: "This school has been provisioned and its workspace is active.",
  },
  REJECTED: {
    label: "Rejected",
    variant: "due",
    description: "This application was rejected.",
  },
};

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status,
      variant: "default" as const,
      description: "",
    }
  );
}

// Fixed locale and zone so server and client render the same string.
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const focusRing = "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";
const secondaryButton = `inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const dangerOutlineButton = `inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

type QueueFilter = "ALL" | "PENDING_REVIEW" | "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING_REVIEW", label: "Ready for review" },
  { value: "PENDING_VERIFICATION", label: "Awaiting verification" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-xs font-semibold break-words text-slate-800">{children}</dd>
    </div>
  );
}

export function PlatformRegistrationsRoster({
  initialRegistrations,
  limit,
}: PlatformRegistrationsRosterProps) {
  const router = useRouter();
  const [registrations, setRegistrations] =
    useState<SerializedRegistration[]>(initialRegistrations);
  const [activeReg, setActiveReg] = useState<SerializedRegistration | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    activationUrl?: string;
    schoolSlug?: string;
  } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QueueFilter>("ALL");
  const [query, setQuery] = useState("");

  const pendingCount = registrations.filter(
    (r) => r.status === "PENDING_VERIFICATION" || r.status === "PENDING_REVIEW"
  ).length;
  const filterCounts = QUEUE_FILTERS.reduce<Record<QueueFilter, number>>(
    (acc, f) => {
      acc[f.value] =
        f.value === "ALL"
          ? registrations.length
          : registrations.filter((r) => r.status === f.value).length;
      return acc;
    },
    { ALL: 0, PENDING_REVIEW: 0, PENDING_VERIFICATION: 0, APPROVED: 0, REJECTED: 0 }
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRegistrations = registrations.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return [r.schoolName, r.schoolCode, r.desiredSlug, r.adminName, r.adminEmail]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const isFiltered = statusFilter !== "ALL" || normalizedQuery !== "";
  const clearFilters = () => {
    setStatusFilter("ALL");
    setQuery("");
  };
  const isBusy = isApproving || isRejecting || deletingId !== null;

  const openReviewModal = (reg: SerializedRegistration) => {
    setActiveReg(reg);
    setShowRejectInput(false);
    setRejectionReason("");
    setErrorMessage(null);
    setApprovalResult(null);
    setCopyState("idle");
  };

  const closeReviewModal = () => {
    setActiveReg(null);
    setShowRejectInput(false);
    setRejectionReason("");
    setErrorMessage(null);
    setApprovalResult(null);
  };

  const handleApprove = async () => {
    if (!activeReg) return;
    setIsApproving(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/platform/registrations/${activeReg.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to approve registration");
      }

      const activationUrl = data.data?.activationUrl;
      const schoolSlug = data.data?.school?.slug || activeReg.desiredSlug;

      setApprovalResult({ activationUrl, schoolSlug });

      const markApproved = (r: SerializedRegistration): SerializedRegistration => ({
        ...r,
        status: "APPROVED",
        schoolId: data.data?.school?.id || r.schoolId,
        school: { slug: schoolSlug },
      });

      setRegistrations((prev) => prev.map((r) => (r.id === activeReg.id ? markApproved(r) : r)));
      setActiveReg((prev) => (prev ? markApproved(prev) : null));
      // Refresh server-rendered counts (schools, pending registrations).
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!activeReg) return;
    setIsRejecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/platform/registrations/${activeReg.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to reject registration");
      }

      // Rejected applications are deleted from the database to immediately release unique fields
      setRegistrations((prev) => prev.filter((r) => r.id !== activeReg.id));
      closeReviewModal();
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async (reg: SerializedRegistration) => {
    if (
      !window.confirm(
        `Permanently delete the registration for ${reg.schoolName}? This frees up the email, school code, and workspace slug.`
      )
    ) {
      return;
    }

    setDeletingId(reg.id);
    setErrorMessage(null);
    setListError(null);
    try {
      const res = await fetch(`/api/v1/platform/registrations/${reg.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Failed to delete registration");
      }

      setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
      if (activeReg?.id === reg.id) {
        closeReviewModal();
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete registration";
      if (activeReg?.id === reg.id) {
        setErrorMessage(msg);
      } else {
        setListError(msg);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch (err) {
      console.error("Copying activation link failed", err);
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  };

  const activeMeta = activeReg ? getStatusMeta(activeReg.status) : null;
  const showingLatest = limit !== undefined && initialRegistrations.length >= limit;

  return (
    <>
      <section
        aria-labelledby="registrations-heading"
        className="shadow-card overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div className="flex flex-col justify-between gap-3 px-5 pt-4 pb-3 sm:flex-row sm:items-center">
          <div>
            <h2 id="registrations-heading" className="text-lg font-bold text-slate-900">
              Registration queue
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Review incoming school registrations. Approving one provisions the school and issues
              an invitation to its administrator.
              {showingLatest && ` Showing the latest ${limit}.`}
            </p>
          </div>
          <Badge
            variant={pendingCount > 0 ? "alert" : "default"}
            className="self-start sm:self-auto"
          >
            {pendingCount === 0 ? "No pending applications" : `${pendingCount} pending`}
          </Badge>
        </div>

        {registrations.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter registrations by status"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0"
            >
              {QUEUE_FILTERS.map((f) => {
                const selected = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setStatusFilter(f.value)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${focusRing} ${
                      selected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${
                        selected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {filterCounts[f.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-full lg:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search registrations"
                placeholder="Search school, code, or admin"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3.5 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
              />
            </div>
          </div>
        )}

        {listError && (
          <div
            role="alert"
            className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs font-semibold text-rose-800"
          >
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{listError}</span>
            <button
              type="button"
              onClick={() => setListError(null)}
              className={`cursor-pointer rounded-md px-1.5 text-rose-800 underline-offset-2 hover:underline ${focusRing}`}
            >
              Dismiss
            </button>
          </div>
        )}

        {registrations.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Clock className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No registrations yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Applications submitted through public school registration appear here.
            </p>
          </div>
        ) : visibleRegistrations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No registrations match these filters
            </p>
            {isFiltered && (
              <button type="button" onClick={clearFilters} className={`mt-3 ${secondaryButton}`}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    School
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Code / slug
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Administrator
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Submitted
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRegistrations.map((reg) => {
                  const meta = getStatusMeta(reg.status);
                  const isDeleting = deletingId === reg.id;
                  return (
                    <tr key={reg.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold whitespace-nowrap text-slate-900">
                          {reg.schoolName}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-mono whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{reg.schoolCode}</span>
                        <span className="text-slate-500"> / {reg.desiredSlug}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{reg.adminName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{reg.adminEmail}</p>
                        {reg.adminPhone && (
                          <p className="font-mono text-[11px] text-slate-500">{reg.adminPhone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={meta.variant} className="whitespace-nowrap">
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                        <time dateTime={reg.createdAt}>
                          {dateFormat.format(new Date(reg.createdAt))}
                        </time>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {reg.status === "APPROVED" ? (
                          <Link
                            href={`/school/${reg.school?.slug || reg.desiredSlug}`}
                            aria-label={`Open ${reg.schoolName} workspace`}
                            className={`${secondaryButton} px-3 py-1.5 whitespace-nowrap`}
                          >
                            <span>Open workspace</span>
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openReviewModal(reg)}
                              aria-label={`Review ${reg.schoolName}`}
                              className={`inline-flex cursor-pointer items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-emerald-800 ${focusRing} focus-visible:ring-offset-2`}
                            >
                              <span>Review</span>
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDelete(reg)}
                              aria-label={`Delete registration for ${reg.schoolName}`}
                              title="Delete registration"
                              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={activeReg !== null}
        onClose={closeReviewModal}
        title={activeReg ? `Review ${activeReg.schoolName}` : "Review registration"}
      >
        {activeReg && activeMeta && (
          <div className="space-y-5">
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                activeMeta.variant === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : activeMeta.variant === "due"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {activeMeta.variant === "emerald" ? (
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              ) : activeMeta.variant === "due" ? (
                <XCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <div className="leading-relaxed">
                <p className="font-bold">{activeMeta.label}</p>
                <p className="mt-0.5">
                  {activeReg.status === "REJECTED" && activeReg.rejectionReason
                    ? `Reason: ${activeReg.rejectionReason}`
                    : activeMeta.description}
                </p>
              </div>
            </div>

            {approvalResult?.activationUrl && (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">School provisioned</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    The school is active. Share this link with its administrator so they can set
                    their password.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="activation-url"
                    className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Password setup link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="activation-url"
                      type="text"
                      readOnly
                      value={approvalResult.activationUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(approvalResult.activationUrl!)}
                      className={`${secondaryButton} shrink-0`}
                    >
                      {copyState === "copied" ? (
                        <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span aria-live="polite">
                        {copyState === "copied"
                          ? "Copied"
                          : copyState === "failed"
                            ? "Copy failed"
                            : "Copy"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={approvalResult.activationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryButton}
                  >
                    <span>Open password setup</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  {approvalResult.schoolSlug && (
                    <Link
                      href={`/school/${approvalResult.schoolSlug}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 ${focusRing} focus-visible:ring-offset-2`}
                    >
                      <span>Open school workspace</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            <section aria-labelledby="reg-school-heading" className="space-y-2.5">
              <h3 id="reg-school-heading" className="text-sm font-bold text-slate-900">
                School
              </h3>
              <dl className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                <DetailItem label="School name">{activeReg.schoolName}</DetailItem>
                <DetailItem label="School code">
                  <span className="font-mono">{activeReg.schoolCode}</span>
                </DetailItem>
                <DetailItem label="Workspace">
                  <span className="font-mono">/school/{activeReg.desiredSlug}</span>
                </DetailItem>
                <DetailItem label="Submitted">
                  <time dateTime={activeReg.createdAt}>
                    {dateTimeFormat.format(new Date(activeReg.createdAt))}
                  </time>
                </DetailItem>
              </dl>
            </section>

            <section aria-labelledby="reg-admin-heading" className="space-y-2.5">
              <h3 id="reg-admin-heading" className="text-sm font-bold text-slate-900">
                School administrator
              </h3>
              <dl className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                <DetailItem label="Full name">{activeReg.adminName}</DetailItem>
                <DetailItem label="Email">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {activeReg.adminEmail}
                  </span>
                </DetailItem>
                <DetailItem label="Phone">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {activeReg.adminPhone ? (
                      <span className="font-mono">{activeReg.adminPhone}</span>
                    ) : (
                      <span className="font-medium text-slate-500">Not provided</span>
                    )}
                  </span>
                </DetailItem>
                <DetailItem label="Email verification">
                  {activeReg.emailVerifiedAt ? (
                    <span className="text-emerald-800">
                      Verified {dateFormat.format(new Date(activeReg.emailVerifiedAt))}
                    </span>
                  ) : (
                    <span className="text-amber-800">Not verified yet</span>
                  )}
                </DetailItem>
              </dl>
            </section>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
              >
                <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {showRejectInput && (
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <label htmlFor="rejection-reason" className="text-xs font-bold text-rose-900">
                  Reason for rejection (optional)
                </label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  autoFocus
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Missing documents or details the applicant should fix…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 focus:outline-none"
                />
                <p className="text-[11px] text-rose-900/80">
                  Rejecting removes the application so the applicant can register again.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={() => setShowRejectInput(false)}
                    className={secondaryButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={handleReject}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                  >
                    {isRejecting && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    <span>{isRejecting ? "Rejecting…" : "Confirm rejection"}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={closeReviewModal} className={secondaryButton}>
                  Close
                </button>
                {activeReg.status !== "APPROVED" && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(activeReg)}
                    className={dangerOutlineButton}
                  >
                    {deletingId === activeReg.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{deletingId === activeReg.id ? "Deleting…" : "Delete"}</span>
                  </button>
                )}
              </div>

              {activeReg.status !== "APPROVED" && (
                <div className="flex flex-wrap items-center gap-2">
                  {!showRejectInput && activeReg.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowRejectInput(true)}
                      className={dangerOutlineButton}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleApprove}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} focus-visible:ring-offset-2`}
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{isApproving ? "Provisioning school…" : "Approve and provision"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
