"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Lock, LockOpen, PencilLine } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import {
  Notice,
  Spinner,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/common/FormControls";
import type { SchoolProfileView } from "../services/school-profile";
import { SchoolProfileSections, SectionState } from "./SchoolProfileSections";
import { SchoolProfileSummary } from "./SchoolProfileSummary";

interface Props {
  schoolSlug: string;
  school: { name: string; code: string };
  initialProfile: SchoolProfileView;
  /** "view" is the saved profile at /settings; "edit" is the three-step form at /settings/edit. */
  mode: "view" | "edit";
  canEdit: boolean;
  canLock: boolean;
}

const focusRing = "focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none";

export function SchoolSettingsClient({
  schoolSlug,
  school,
  initialProfile,
  mode,
  canEdit,
  canLock,
}: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<SchoolProfileView>(initialProfile);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockMessage, setLockMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(
    null
  );

  const isLocked = profile.lock.isLocked;
  const viewHref = `/school/${schoolSlug}/settings`;
  const editHref = `${viewHref}/edit`;

  /** Sets the lock; on success unlocking opens the form and locking returns to the profile. */
  async function setLock(locked: boolean) {
    setConfirmUnlock(false);
    setLockMessage(null);
    setLocking(true);
    try {
      const res = await fetch(`/api/v1/school/${schoolSlug}/profile/master/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setLockMessage({
          kind: "error",
          text: json?.error?.message || "Could not change the lock. Please try again.",
        });
        return;
      }
      setProfile(json.data.profile);
      if (!locked && canEdit) {
        router.push(editHref);
        return;
      }
      if (mode === "edit") {
        router.push(viewHref);
        router.refresh();
        return;
      }
      setLockMessage({
        kind: "ok",
        text: locked
          ? "Profile locked. It is now read-only for everyone until it is unlocked."
          : "Profile unlocked. Administrators can edit it again.",
      });
    } catch (err) {
      console.error("Changing profile lock failed", err);
      setLockMessage({
        kind: "error",
        text: "Network error while changing the lock. Please try again.",
      });
    } finally {
      setLocking(false);
    }
  }

  const lockedOn =
    profile.lock.lockedAt &&
    new Date(profile.lock.lockedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="min-w-0">
        <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
          <Link
            href={`/school/${schoolSlug}`}
            className={`rounded transition-colors hover:text-emerald-700 ${focusRing}`}
          >
            {school.name}
          </Link>
          <span aria-hidden="true"> / </span>
          {mode === "edit" ? (
            <>
              <Link
                href={viewHref}
                className={`rounded transition-colors hover:text-emerald-700 ${focusRing}`}
              >
                Profile
              </Link>
              <span aria-hidden="true"> / </span>
              <span className="text-slate-800">Edit</span>
            </>
          ) : (
            <span className="text-slate-800">Profile</span>
          )}
        </nav>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          {mode === "edit" ? "Edit school profile" : "School profile"}
        </h1>
      </header>

      {/* Profile identity bar with its actions */}
      <section
        aria-label="Profile actions"
        className="shadow-card flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >

        <div className="flex flex-wrap items-center gap-2.5">
          {mode === "edit" ? (
            <Link href={viewHref} className={secondaryButtonClass}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to profile
            </Link>
          ) : (
            <>
              {/* A super admin can unlock but not edit; a school admin unlocks through Edit. */}
              {canLock && !canEdit && isLocked && (
                <button
                  type="button"
                  onClick={() => setConfirmUnlock(true)}
                  disabled={locking}
                  className={secondaryButtonClass}
                >
                  {locking ? <Spinner /> : <LockOpen className="h-4 w-4" aria-hidden="true" />}
                  Unlock profile
                </button>
              )}
              {canEdit &&
                (isLocked ? (
                  <button
                    type="button"
                    onClick={() => setConfirmUnlock(true)}
                    disabled={locking}
                    className={primaryButtonClass}
                  >
                    {locking ? <Spinner /> : <PencilLine className="h-4 w-4" aria-hidden="true" />}
                    Edit profile
                  </button>
                ) : (
                  <Link href={editHref} className={primaryButtonClass}>
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                ))}
              {canLock && !isLocked && profile.isComplete && (
                <button
                  type="button"
                  onClick={() => setLock(true)}
                  disabled={locking}
                  className={secondaryButtonClass}
                >
                  {locking ? <Spinner /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                  Lock profile
                </button>
              )}
            </>
          )}
          <a
            href={`/print/school-profile/${schoolSlug}`}
            target="_blank"
            rel="noopener"
            className={secondaryButtonClass}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            View &amp; export PDF
          </a>
        </div>
      </section>

      {lockMessage?.kind === "error" && <Notice>{lockMessage.text}</Notice>}
      {lockMessage?.kind === "ok" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          {lockMessage.text}
        </p>
      )}

      {mode === "edit" ? (
        <SchoolProfileSections
          schoolSlug={schoolSlug}
          profile={profile}
          onProfileChange={setProfile}
          onFinish={() => setLock(true)}
        />
      ) : (
        <SchoolProfileSummary profile={profile} />
      )}

      <Modal
        isOpen={confirmUnlock}
        onClose={() => setConfirmUnlock(false)}
        title={canEdit ? "Unlock and edit profile?" : "Unlock profile?"}
        maxWidth="max-w-md"
      >
        <p className="text-sm text-slate-600">
          {canEdit
            ? "Unlocking opens the three-step form so you can change the school's official details. Saving the last step locks the profile again."
            : "The school administrator will be able to edit the profile until it is locked again."}
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmUnlock(false)}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setLock(false)}
            disabled={locking}
            className={primaryButtonClass}
          >
            {locking ? <Spinner /> : <LockOpen className="h-4 w-4" aria-hidden="true" />}
            {canEdit ? "Unlock & edit" : "Unlock profile"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default SchoolSettingsClient;
