/**
 * Class structure implied by the Master School Profile's academic step: which classes a
 * recognised class range covers, and the default subjects each level starts with.
 *
 * Client-safe (no Prisma or server imports) so the profile wizard can preview exactly what
 * saving the step will create, and the academics service can create it.
 */
import { getClassRange } from "./school-profile-rules";

export interface TemplateClass {
  /** Stored class name, e.g. "Nursery" or "Class 7". */
  name: string;
  /** Sort order: Nursery 0, LKG 1, UKG 2, Class n → n + 2. */
  numericOrder: number;
  /** 0 for pre-primary, otherwise the grade number. */
  grade: number;
}

export const PRE_PRIMARY_CLASSES: TemplateClass[] = [
  { name: "Nursery", numericOrder: 0, grade: 0 },
  { name: "LKG", numericOrder: 1, grade: 0 },
  { name: "UKG", numericOrder: 2, grade: 0 },
];

export function gradeClass(grade: number): TemplateClass {
  return { name: `Class ${grade}`, numericOrder: grade + 2, grade };
}

/** Classes for a recognised range, pre-primary first when it applies. */
export function classesForRange(
  classRange?: string | null,
  includesPrePrimary?: boolean
): TemplateClass[] {
  const range = getClassRange(classRange);
  if (!range) return [];
  const grades = Array.from({ length: range.end - range.start + 1 }, (_, i) =>
    gradeClass(range.start + i)
  );
  return includesPrePrimary && range.start === 1 ? [...PRE_PRIMARY_CLASSES, ...grades] : grades;
}

const STREAM_SUBJECTS: Record<string, string[]> = {
  SCIENCE: ["Physics", "Chemistry", "Mathematics", "Biology"],
  COMMERCE: ["Accountancy", "Business Studies", "Economics"],
  ARTS: ["History", "Political Science", "Geography"],
  AGRICULTURE: ["Agriculture"],
  VOCATIONAL: ["Information Technology"],
};

/** Default subjects for a class level, following the common CBSE / state-board scheme. */
export function defaultSubjectsFor(grade: number, streams: readonly string[] = []): string[] {
  if (grade === 0) return ["English", "Hindi", "Mathematics", "General Awareness", "Art & Craft"];
  if (grade <= 2) return ["English", "Hindi", "Mathematics", "Art Education"];
  if (grade <= 5) {
    return ["English", "Hindi", "Mathematics", "Environmental Studies", "Computer Science"];
  }
  if (grade <= 8) {
    return [
      "English",
      "Hindi",
      "Sanskrit",
      "Mathematics",
      "Science",
      "Social Science",
      "Computer Science",
    ];
  }
  if (grade <= 10) {
    return [
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Science",
      "Information Technology",
    ];
  }
  const streamSubjects = streams.flatMap((s) => STREAM_SUBJECTS[s] ?? []);
  return Array.from(new Set(["English Core", ...streamSubjects, "Physical Education"]));
}

/** Grade of an existing class name, if it follows the template naming (else null). */
export function gradeOfClassName(name: string): number | null {
  const trimmed = name.trim().toLowerCase();
  if (PRE_PRIMARY_CLASSES.some((c) => c.name.toLowerCase() === trimmed)) return 0;
  const match = /^class\s+(\d{1,2})$/.exec(trimmed);
  return match ? Number(match[1]) : null;
}

/** Next section letter after the ones a class already has: A, B … Z, then AA. */
export function nextSectionName(existing: readonly string[]): string {
  const taken = new Set(existing.map((n) => n.trim().toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!taken.has(letter)) return letter;
  }
  let n = 0;
  while (taken.has(`A${n}`)) n++;
  return `A${n}`;
}
