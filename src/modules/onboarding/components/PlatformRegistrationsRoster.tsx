"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";

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
}

export function PlatformRegistrationsRoster({
  initialRegistrations,
}: PlatformRegistrationsRosterProps) {
  const [registrations, setRegistrations] = useState<SerializedRegistration[]>(initialRegistrations);
  const [activeReg, setActiveReg] = useState<SerializedRegistration | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    activationUrl?: string;
    schoolSlug?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const pendingCount = registrations.filter(
    (r) => r.status === "PENDING_VERIFICATION" || r.status === "PENDING_REVIEW"
  ).length;

  const openReviewModal = (reg: SerializedRegistration) => {
    setActiveReg(reg);
    setShowRejectInput(false);
    setRejectionReason("");
    setErrorMessage(null);
    setApprovalResult(null);
    setCopiedLink(false);
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

      // Update in local state
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === activeReg.id
            ? {
                ...r,
                status: "APPROVED",
                schoolId: data.data?.school?.id || r.schoolId,
                school: { slug: schoolSlug },
              }
            : r
        )
      );

      // Update activeReg
      setActiveReg((prev) =>
        prev
          ? {
              ...prev,
              status: "APPROVED",
              schoolId: data.data?.school?.id || prev.schoolId,
              school: { slug: schoolSlug },
            }
          : null
      );
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

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === activeReg.id
            ? {
                ...r,
                status: "REJECTED",
                rejectionReason: rejectionReason.trim() || null,
              }
            : r
        )
      );

      closeReviewModal();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRejecting(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black tracking-tight text-white">
                School Registrations Queue ({registrations.length})
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Review and approve incoming institution registrations, provision tenant databases, and issue admin invitations
            </p>
          </div>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            {pendingCount} Pending Review / Verification
          </span>
        </div>

        {registrations.length === 0 ? (
          <div className="p-16 text-center">
            <Clock className="mx-auto h-12 w-12 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-400">
              No registration applications submitted yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-4">Applicant Institution</th>
                  <th className="px-6 py-4">Desired Code / Slug</th>
                  <th className="px-6 py-4">Contact Admin</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{reg.schoolName}</p>
                      <p className="font-mono text-[11px] text-slate-500">ID: {reg.id}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-purple-300">
                        {reg.schoolCode}
                      </span>{" "}
                      <span className="text-slate-500">/ {reg.desiredSlug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-200">{reg.adminName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{reg.adminEmail}</p>
                      {reg.adminPhone && (
                        <p className="text-[11px] text-slate-500">{reg.adminPhone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          reg.status === "APPROVED"
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : reg.status === "PENDING_REVIEW"
                              ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : reg.status === "PENDING_VERIFICATION"
                                ? "border border-blue-500/30 bg-blue-500/10 text-blue-300"
                                : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            reg.status === "APPROVED"
                              ? "bg-emerald-400"
                              : reg.status === "PENDING_REVIEW"
                                ? "bg-amber-400"
                                : reg.status === "PENDING_VERIFICATION"
                                  ? "bg-blue-400"
                                  : "bg-rose-400"
                          }`}
                        />
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {reg.status === "APPROVED" ? (
                        <Link
                          href={`/school/${reg.school?.slug || reg.desiredSlug}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white"
                        >
                          <span>Provisioned</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReviewModal(reg)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-300 transition-all hover:border-purple-500 hover:bg-purple-600 hover:text-white"
                        >
                          <span>Review</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Interactive Review Modal */}
      {activeReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 transition-opacity"
            onClick={closeReviewModal}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white">Review Registration Application</h3>
                  <p className="text-xs text-slate-400">
                    Application ID: <span className="font-mono text-purple-400">{activeReg.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
              {/* Status Alert */}
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  activeReg.status === "APPROVED"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : activeReg.status === "PENDING_REVIEW"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : activeReg.status === "PENDING_VERIFICATION"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {activeReg.status === "APPROVED" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : activeReg.status === "PENDING_REVIEW" ? (
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                ) : activeReg.status === "PENDING_VERIFICATION" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                )}
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">
                    Status: <span className="uppercase">{activeReg.status.replace("_", " ")}</span>
                  </p>
                  <p className="mt-0.5 opacity-90">
                    {activeReg.status === "APPROVED"
                      ? "This institution has been successfully provisioned into a tenant school."
                      : activeReg.status === "PENDING_REVIEW"
                        ? "The applicant administrator has verified their email address. The application is ready for Super Admin approval."
                        : activeReg.status === "PENDING_VERIFICATION"
                          ? "The applicant email verification is currently pending. You can still approve this school manually if required."
                          : `Application rejected: ${activeReg.rejectionReason || "No reason specified."}`}
                  </p>
                </div>
              </div>

              {/* Success Result Box when approved */}
              {approvalResult?.activationUrl && (
                <div className="space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <h4 className="font-bold">Tenant Successfully Provisioned!</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    The tenant school is active. An invitation was issued for the primary administrator to set their password.
                  </p>

                  <div className="mt-2 space-y-2">
                    <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Admin Password Setup / Activation URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={approvalResult.activationUrl}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-300 select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(approvalResult.activationUrl!)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href={approvalResult.activationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white"
                    >
                      <span>Open Password Setup Screen</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {approvalResult.schoolSlug && (
                      <Link
                        href={`/school/${approvalResult.schoolSlug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white"
                      >
                        <span>Open School Workspace</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Institution Details */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <Building2 className="h-4 w-4 text-purple-400" />
                  Institution Information
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2">
                  <div>
                    <span className="text-[11px] text-slate-500">Official School Name</span>
                    <p className="font-bold text-white">{activeReg.schoolName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">School Code</span>
                    <p className="font-mono font-bold text-indigo-400">{activeReg.schoolCode}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Workspace Slug</span>
                    <p className="font-mono text-xs text-purple-300">/school/{activeReg.desiredSlug}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Submitted Date</span>
                    <p className="text-xs text-slate-300">
                      {new Date(activeReg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Administrator Contact Details */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <User className="h-4 w-4 text-indigo-400" />
                  Designated School Administrator
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2">
                  <div>
                    <span className="text-[11px] text-slate-500">Full Name</span>
                    <p className="font-bold text-white">{activeReg.adminName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Email Address</span>
                    <p className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      {activeReg.adminEmail}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Phone Number</span>
                    <p className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      {activeReg.adminPhone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Email Verification</span>
                    <p className="text-xs">
                      {activeReg.emailVerifiedAt ? (
                        <span className="font-bold text-emerald-400">
                          Verified on {new Date(activeReg.emailVerifiedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-amber-400">Verification Pending</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Rejection input box */}
              {showRejectInput && (
                <div className="space-y-2 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
                  <label className="text-xs font-bold text-rose-300">
                    Reason for rejection (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide notes or missing requirements for the applicant..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isRejecting}
                      onClick={handleReject}
                      className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/80 px-6 py-4">
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Close
              </button>

              {activeReg.status !== "APPROVED" && (
                <div className="flex items-center gap-3">
                  {!showRejectInput && activeReg.status !== "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-600 hover:text-white"
                    >
                      Reject Application
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApproving ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Provisioning School Tenant...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve & Provision School</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
