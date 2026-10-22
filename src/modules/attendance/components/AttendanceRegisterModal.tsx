"use client";

import React, { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Calendar, Check, X, Clock, AlertCircle } from "lucide-react";
import { ClassRegisterItem } from "./ClassRegisterCard";

export interface StudentItem {
  id: string;
  name: string;
  admissionNo: string;
  rollNumber?: number | string | null;
  gender: string;
}

interface AttendanceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: ClassRegisterItem | null;
  students?: StudentItem[];
  date?: string;
}

export function AttendanceRegisterModal({
  isOpen,
  onClose,
  classItem,
  students = [],
  date = new Date().toISOString().slice(0, 10),
}: AttendanceRegisterModalProps) {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "P" | "A" | "L">>({});

  const handleStatusChange = (studentId: string, status: "P" | "A" | "L") => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: "P" | "A" | "L") => {
    const updated: Record<string, "P" | "A" | "L"> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const presentCount = Object.values(attendanceMap).filter((v) => v === "P").length;
  const absentCount = Object.values(attendanceMap).filter((v) => v === "A").length;
  const leaveCount = Object.values(attendanceMap).filter((v) => v === "L").length;

  if (!classItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Daily Register - ${classItem.name}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Preview disclaimer */}
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>UI Preview Mode:</strong> The physical notebook attendance register is ready.
            Persistence will be connected when the attendance database module is provisioned.
          </span>
        </div>

        {/* Meta Bar */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800">Date: {date}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">{students.length} Students on Roster</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleMarkAll("P")}
              className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-200"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("A")}
              className="rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 transition-colors hover:bg-rose-200"
            >
              All Absent
            </button>
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Present</span>
            <p className="font-mono text-lg font-black text-emerald-900">{presentCount}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-center">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Absent</span>
            <p className="font-mono text-lg font-black text-rose-900">{absentCount}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Leave</span>
            <p className="font-mono text-lg font-black text-amber-900">{leaveCount}</p>
          </div>
        </div>

        {/* Student Register Table */}
        <div className="max-h-80 overflow-hidden overflow-y-auto rounded-2xl border border-slate-100">
          {students.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students enrolled in this class yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Admission No</th>
                  <th className="px-4 py-2.5">Student Name</th>
                  <th className="px-4 py-2.5">Gender</th>
                  <th className="px-4 py-2.5 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const currentStatus = attendanceMap[student.id] || "P";
                  return (
                    <tr key={student.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-mono font-bold text-slate-600">
                        {student.admissionNo}
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-900">{student.name}</td>
                      <td className="px-4 py-2 text-slate-500">{student.gender}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "P")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "P"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "A")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "A"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-800"
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "L")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "L"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default AttendanceRegisterModal;
