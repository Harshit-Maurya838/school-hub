// Exams: result reports and statistics.
import { prisma } from "@/lib/prisma";
import { AuthenticatedUser, assertSchoolAccess } from "@/modules/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ExamStatus, ExamMarksSubmissionStatus } from "@/generated/prisma/enums";

// ============================================================================
// Examination Reports and Statistics
// ============================================================================

export interface SubjectMarksSummary {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  totalEnrolled: number;
  appeared: number;
  absent: number;
  exempt: number;
  passed: number;
  failed: number;
  passPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  status: ExamMarksSubmissionStatus;
}

export interface StudentResultItem {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  marksObtained: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  status: "PASS" | "FAIL" | "ABSENT" | "EXEMPT" | "UNMARKED";
}

export interface StudentExamSummary {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  sectionName: string;
  className: string;
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  overallStatus: "PASS" | "FAIL" | "INCOMPLETE";
  results: StudentResultItem[];
}

export async function getExamReports(schoolId: string, user: AuthenticatedUser, examId: string) {
  assertSchoolAccess(user, schoolId);

  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError("Accountants are not authorized to view examination reports.");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      classes: {
        include: {
          class: {
            include: {
              sections: true,
            },
          },
        },
      },
      subjectConfigs: {
        include: {
          subject: true,
          class: true,
        },
      },
      sectionSubjects: true,
      studentMarks: {
        include: {
          student: true,
          section: {
            include: { class: true },
          },
          subject: true,
        },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError(`Examination '${examId}' not found.`);
  }

  // Access control for non-admin: TEACHER can only see if PUBLISHED or their assigned subjects
  if (user.role !== "SCHOOL_ADMIN" && user.role !== "SUPER_ADMIN") {
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenError("Examination results have not been published yet.");
    }
  }

  // 1. Completion Overview
  const totalSubmissionsExpected = exam.classes.reduce((sum, c) => {
    const classSectionsCount = c.class.sections.length;
    const classSubjectsCount = exam.subjectConfigs.filter(
      (cfg) => cfg.classId === c.classId
    ).length;
    return sum + classSectionsCount * classSubjectsCount;
  }, 0);

  const statusCounts = {
    NOT_STARTED: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    RETURNED: 0,
    APPROVED: 0,
    PUBLISHED: 0,
  };

  for (const ss of exam.sectionSubjects) {
    if (statusCounts[ss.status] !== undefined) {
      statusCounts[ss.status]++;
    }
  }

  statusCounts.NOT_STARTED = Math.max(0, totalSubmissionsExpected - exam.sectionSubjects.length);

  const completedCount =
    exam.status === ExamStatus.PUBLISHED
      ? statusCounts.PUBLISHED
      : statusCounts.APPROVED + statusCounts.PUBLISHED;

  const completionPercentage =
    totalSubmissionsExpected > 0
      ? Math.round((completedCount / totalSubmissionsExpected) * 100)
      : 0;

  // 2. Subject-wise summaries
  const subjectSummaries: SubjectMarksSummary[] = [];

  for (const examClass of exam.classes) {
    const classSections = examClass.class.sections;
    const classConfigs = exam.subjectConfigs.filter((cfg) => cfg.classId === examClass.classId);

    for (const section of classSections) {
      for (const config of classConfigs) {
        const sectionMarks = exam.studentMarks.filter(
          (m) => m.sectionId === section.id && m.subjectId === config.subjectId
        );

        const workflow = exam.sectionSubjects.find(
          (ss) => ss.sectionId === section.id && ss.subjectId === config.subjectId
        );

        let appeared = 0;
        let absent = 0;
        let exempt = 0;
        let passed = 0;
        let failed = 0;
        let marksSum = 0;
        let highest = 0;
        let lowest = config.maxMarks;

        for (const m of sectionMarks) {
          if (m.isAbsent) {
            absent++;
          } else if (m.isExempt) {
            exempt++;
          } else if (m.marksObtained !== null) {
            appeared++;
            marksSum += m.marksObtained;
            if (m.marksObtained >= config.passMarks) {
              passed++;
            } else {
              failed++;
            }
            if (m.marksObtained > highest) highest = m.marksObtained;
            if (m.marksObtained < lowest) lowest = m.marksObtained;
          }
        }

        const passPercentage = appeared > 0 ? Math.round((passed / appeared) * 100) : 0;
        const averageMarks = appeared > 0 ? Number((marksSum / appeared).toFixed(1)) : 0;

        subjectSummaries.push({
          classId: examClass.class.id,
          className: examClass.class.name,
          sectionId: section.id,
          sectionName: section.name,
          subjectId: config.subject.id,
          subjectName: config.subject.name,
          maxMarks: config.maxMarks,
          passMarks: config.passMarks,
          totalEnrolled: sectionMarks.length,
          appeared,
          absent,
          exempt,
          passed,
          failed,
          passPercentage,
          averageMarks,
          highestMarks: appeared > 0 ? highest : 0,
          lowestMarks: appeared > 0 ? lowest : 0,
          status: workflow?.status ?? ExamMarksSubmissionStatus.NOT_STARTED,
        });
      }
    }
  }

  // 3. Student result summaries (grouped by student)
  const studentMap = new Map<
    string,
    {
      student: { id: string; name: string; admissionNumber: string };
      sectionName: string;
      className: string;
      marks: typeof exam.studentMarks;
    }
  >();

  for (const m of exam.studentMarks) {
    if (!studentMap.has(m.studentId)) {
      studentMap.set(m.studentId, {
        student: m.student,
        sectionName: m.section.name,
        className: m.section.class.name,
        marks: [],
      });
    }
    studentMap.get(m.studentId)!.marks.push(m);
  }

  const studentSummaries: StudentExamSummary[] = [];

  for (const [, item] of studentMap) {
    let totalMax = 0;
    let totalObtained = 0;
    let anyFail = false;
    let anyIncomplete = false;

    const results: StudentResultItem[] = item.marks.map((m) => {
      const config = exam.subjectConfigs.find(
        (cfg) => cfg.subjectId === m.subjectId && cfg.classId === m.section.classId
      );
      const maxMarks = config?.maxMarks ?? 100;
      const passMarks = config?.passMarks ?? 40;

      totalMax += maxMarks;

      let status: "PASS" | "FAIL" | "ABSENT" | "EXEMPT" | "UNMARKED" = "UNMARKED";
      if (m.isAbsent) {
        status = "ABSENT";
        anyFail = true;
      } else if (m.isExempt) {
        status = "EXEMPT";
      } else if (m.marksObtained !== null) {
        totalObtained += m.marksObtained;
        if (m.marksObtained >= passMarks) {
          status = "PASS";
        } else {
          status = "FAIL";
          anyFail = true;
        }
      } else {
        anyIncomplete = true;
      }

      return {
        subjectId: m.subject.id,
        subjectName: m.subject.name,
        maxMarks,
        passMarks,
        marksObtained: m.marksObtained,
        isAbsent: m.isAbsent,
        isExempt: m.isExempt,
        status,
      };
    });

    const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
    const overallStatus = anyIncomplete ? "INCOMPLETE" : anyFail ? "FAIL" : "PASS";

    studentSummaries.push({
      studentId: item.student.id,
      name: item.student.name,
      admissionNumber: item.student.admissionNumber,
      rollNumber: null,
      sectionName: item.sectionName,
      className: item.className,
      totalMaxMarks: totalMax,
      totalMarksObtained: totalObtained,
      percentage,
      overallStatus,
      results,
    });
  }

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
      startDate: exam.startDate.toISOString(),
      endDate: exam.endDate.toISOString(),
      publishedAt: exam.publishedAt?.toISOString() ?? null,
    },
    completion: {
      totalExpected: totalSubmissionsExpected,
      completed: completedCount,
      percentage: completionPercentage,
      statusCounts,
    },
    subjectSummaries,
    studentSummaries,
  };
}
