"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Send,
  RotateCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  XCircle,
  Users,
  Filter,
  X,
} from "lucide-react";
import { StaffDirectoryItem } from "../services/staff-management";

interface StaffRosterTableProps {
  schoolSlug: string;
  initialStaff: StaffDirectoryItem[];
  currentAcademicYearName?: string;
}

export function StaffRosterTable({ schoolSlug, initialStaff }: StaffRosterTableProps) {
  const [staff, setStaff] = useState<StaffDirectoryItem[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Invite action state
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteModalData, setInviteModalData] = useState<{
    staffName: string;
    email: string;
    actionUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Send or Resend invitation for a staff member
  const handleInviteStaff = (member: StaffDirectoryItem) => {
    setActionError(null);
    setInvitingId(member.id);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/school/${schoolSlug}/staff/${member.id}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok) {
          setActionError(data?.error?.message || "Failed to issue invitation.");
          setInvitingId(null);
          return;
        }

        const actionUrl = data.data.actionUrl;
        const newInvite = data.data.invitation;

        // Optimistically update the staff row to PENDING
        setStaff((prev) =>
          prev.map((s) => {
            if (s.id === member.id) {
              return {
                ...s,
                invitationStatus: "PENDING",
                latestInvitation: {
                  id: newInvite.id,
                  status: newInvite.status,
                  expiresAt: newInvite.expiresAt,
                  createdAt: new Date().toISOString(),
                },
              };
            }
            return s;
          })
        );

        setInviteModalData({
          staffName: member.name,
          email: member.email || "",
          actionUrl,
        });
        setCopiedLink(false);
      } catch {
        setActionError("Network error while issuing staff invitation.");
      } finally {
        setInvitingId(null);
      }
    });
  };

  const handleCopyLink = () => {
    if (inviteModalData?.actionUrl) {
      navigator.clipboard.writeText(inviteModalData.actionUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Filter staff list
  const filteredStaff = staff.filter((member) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      member.name.toLowerCase().includes(q) ||
      (member.email && member.email.toLowerCase().includes(q)) ||
      (member.teacherProfile?.employeeId &&
        member.teacherProfile.employeeId.toLowerCase().includes(q)) ||
      (member.teacherProfile?.department &&
        member.teacherProfile.department.toLowerCase().includes(q));

    const matchesRole = roleFilter === "ALL" || member.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter === "ACTIVE") {
      matchesStatus = member.invitationStatus === "ACTIVE";
    } else if (statusFilter === "PENDING") {
      matchesStatus = member.invitationStatus === "PENDING";
    } else if (statusFilter === "EXPIRED") {
      matchesStatus = member.invitationStatus === "EXPIRED";
    } else if (statusFilter === "NOT_INVITED") {
      matchesStatus = member.invitationStatus === "NOT_INVITED";
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, employee ID, or department..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-10 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="TEACHER">Teachers</option>
              <option value="ACCOUNTANT">Accountants</option>
              <option value="SCHOOL_ADMIN">Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Onboarded)</option>
              <option value="PENDING">Invite Pending</option>
              <option value="EXPIRED">Invite Expired</option>
              <option value="NOT_INVITED">Not Invited Yet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Staff Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              No staff members match the selected criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Personnel Member</th>
                  <th className="px-5 py-3.5">Role / Position</th>
                  <th className="px-5 py-3.5">Account & Invite Status</th>
                  <th className="px-5 py-3.5">Class / Assignment</th>
                  <th className="px-5 py-3.5 text-center">Workload</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.map((member) => {
                  const teacher = member.teacherProfile;
                  const isTeacher = member.role === "TEACHER";
                  const isInvitingThis = invitingId === member.id;

                  return (
                    <tr key={member.id} className="group transition-colors hover:bg-slate-50/70">
                      {/* Name & Contact */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-black text-emerald-800">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 group-hover:text-emerald-700">
                                {member.name}
                              </p>
                              {teacher?.employeeId && (
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                                  {teacher.employeeId}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="font-mono">{member.email}</span>
                              {member.phone && <span>• {member.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Designation */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                              member.role === "SCHOOL_ADMIN"
                                ? "bg-emerald-100 text-emerald-800"
                                : member.role === "TEACHER"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {member.role}
                          </span>
                          {teacher?.designation && (
                            <p className="text-[11px] font-semibold text-slate-600">
                              {teacher.designation}
                            </p>
                          )}
                          {teacher?.department && (
                            <p className="text-[10px] text-slate-400">{teacher.department}</p>
                          )}
                        </div>
                      </td>

                      {/* Account & Invite Status */}
                      <td className="px-5 py-3.5">
                        {member.invitationStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Active Account</span>
                          </span>
                        ) : member.invitationStatus === "PENDING" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>Invite Pending</span>
                            </span>
                            {member.latestInvitation?.expiresAt && (
                              <p className="text-[10px] text-slate-400">
                                Expires{" "}
                                {new Date(member.latestInvitation.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : member.invitationStatus === "EXPIRED" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                              <XCircle className="h-3 w-3 text-rose-600" />
                              <span>Invite Expired</span>
                            </span>
                            <p className="text-[10px] font-semibold text-rose-500">
                              Link expired • Resend below
                            </p>
                          </div>
                        ) : member.invitationStatus === "REVOKED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            <XCircle className="h-3 w-3 text-slate-400" />
                            <span>Invite Revoked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>Not Invited Yet</span>
                          </span>
                        )}
                      </td>

                      {/* Class Teacher / Assignments */}
                      <td className="px-5 py-3.5">
                        {isTeacher ? (
                          teacher?.classTeacherFor ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              <span>
                                {teacher.classTeacherFor.className} - Section{" "}
                                {teacher.classTeacherFor.sectionName}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Workload */}
                      <td className="px-5 py-3.5 text-center">
                        {isTeacher && teacher ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              teacher.workloadStatus === "HIGH"
                                ? "border border-amber-200 bg-amber-100 text-amber-800"
                                : teacher.workloadStatus === "NORMAL"
                                  ? "border border-blue-200 bg-blue-50 text-blue-800"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {teacher.sectionsCount} Sections ({teacher.workloadStatus})
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send / Resend Invitation Button */}
                          {member.invitationStatus === "NOT_INVITED" && (
                            <button
                              type="button"
                              onClick={() => handleInviteStaff(member)}
                              disabled={isInvitingThis || isPending}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                              title="Send one-time activation invite"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{isInvitingThis ? "Sending..." : "Invite"}</span>
                            </button>
                          )}

                          {member.invitationStatus === "EXPIRED" && (
                            <button
                              type="button"
                              onClick={() => handleInviteStaff(member)}
                              disabled={isInvitingThis || isPending}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                              title="Link expired - generate new activation link"
                            >
                              <RotateCw className="h-3.5 w-3.5 text-amber-700" />
                              <span>{isInvitingThis ? "Sending..." : "Resend Invite"}</span>
                            </button>
                          )}

                          {member.invitationStatus === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleInviteStaff(member)}
                              disabled={isInvitingThis || isPending}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                              title="Resend activation invite email"
                            >
                              <RotateCw className="h-3 w-3 text-slate-500" />
                              <span>{isInvitingThis ? "Sending..." : "Resend"}</span>
                            </button>
                          )}

                          {/* Profile Link */}
                          {isTeacher && (
                            <Link
                              href={`/school/${schoolSlug}/staff/${member.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-800"
                            >
                              <span>Profile</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invitation Link Modal */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Invitation Successfully Issued!</span>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                An activation link has been generated and emailed to{" "}
                <span className="font-bold text-emerald-950">{inviteModalData.email}</span> for{" "}
                <span className="font-bold text-emerald-950">{inviteModalData.staffName}</span>.
                Valid for 48 hours.
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Direct Activation Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteModalData.actionUrl}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalData(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
