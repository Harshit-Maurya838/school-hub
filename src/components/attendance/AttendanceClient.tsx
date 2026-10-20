"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CalendarDays, UserCheck, AlertCircle, Shield, Layers, ArrowRight } from "lucide-react";
import { ClassRegisterCard, ClassRegisterItem } from "./ClassRegisterCard";
import { AttendanceRegisterModal, StudentItem } from "./AttendanceRegisterModal";

interface ClassWithStudents extends ClassRegisterItem {
  students: StudentItem[];
}

interface AttendanceClientProps {
  schoolSlug: string;
  schoolName: string;
  userRole: string;
  classes: ClassWithStudents[];
  currentSession?: string;
}

export function AttendanceClient({
  schoolSlug,
  schoolName,
  userRole,
  classes,
  currentSession = "2026-27",
}: AttendanceClientProps) {
  const [selectedClass, setSelectedClass] = useState<ClassWithStudents | null>(null);

  const totalStudents = classes.reduce((acc, c) => acc + c.studentCount, 0);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/school/${schoolSlug}`}
              className="transition-colors hover:text-emerald-700"
            >
              {schoolName}
            </Link>
            <span>/</span>
            <span className="text-slate-800">Attendance</span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Physical Notebook Attendance Registers
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Physical classroom attendance ledger book interface with real school class cohorts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
            <span>Session: {currentSession}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>{userRole}</span>
          </div>
        </div>
      </div>

      {/* Development status alert banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <h3 className="text-xs font-extrabold tracking-wider text-amber-950 uppercase">
            UI Reference & Architecture Preview
          </h3>
          <p className="text-xs text-amber-800">
            This module displays the complete{" "}
            <strong>CampusPulse physical notebook attendance register</strong> UI connected to your
            real classes. In strict adherence to database integrity rules, attendance marks will not
            be persisted to local storage or dummy tables until the dedicated attendance database
            schema is deployed.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Classes With Registers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900">{classes.length}</p>
          <p className="mt-1 text-xs text-slate-400">Configured grade standards</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Total Enrolled Students
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900">{totalStudents}</p>
          <p className="mt-1 text-xs text-slate-400">Eligible attendance roll</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Engine Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-base font-black text-amber-800">Preview Architecture</p>
          <p className="mt-1 text-xs text-slate-400">Ready for schema deployment</p>
        </div>
      </div>

      {/* Class Registers Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">
            Classroom Physical Registers ({classes.length})
          </h3>
          <span className="text-xs text-slate-400">Click any book to open attendance ledger</span>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-xs">
            <Layers className="mx-auto h-10 w-10 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-800">No classes configured yet</h4>
            <p className="mt-1 text-xs text-slate-500">
              Set up classes in Academic Setup to generate physical attendance registers.
            </p>
            <div className="mt-4">
              <Link
                href={`/school/${schoolSlug}/academics/classes`}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                <span>Go to Classes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <ClassRegisterCard
                key={cls.id}
                classItem={cls}
                session={currentSession}
                onClick={() => setSelectedClass(cls)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedClass && (
        <AttendanceRegisterModal
          isOpen={Boolean(selectedClass)}
          onClose={() => setSelectedClass(null)}
          classItem={selectedClass}
          students={selectedClass.students}
        />
      )}
    </div>
  );
}
export default AttendanceClient;
