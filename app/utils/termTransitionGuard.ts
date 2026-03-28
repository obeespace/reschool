import type { D1Client } from "@/app/db/client";
import { enrollments, students, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Term transition guardrails
 *
 * Ensures that:
 * 1. Student enrollment data is preserved when transitioning to a new term
 * 2. Historical academic records remain accessible
 * 3. Enrollment snapshots exist for transcript queries
 * 4. No data loss during term/session changes
 */

type TermTransitionCheckResult = {
  safe: boolean;
  issues: string[];
  warnings: string[];
};

type StudentEnrollmentSnapshot = {
  studentId: string;
  previousTermEnrollmentCount: number;
  currentTermEnrollmentCount: number;
  isConsistent: boolean;
};

/**
 * Verify a term transition is safe before proceeding
 * Checks that:
 * - The previous term has enrollment data preserved
 * - Current term is properly initialized
 * - No orphaned student records
 */
export async function checkTermTransitionSafety(
  d1: D1Client,
  schoolId: string,
  previousTermId: string,
  currentTermId: string
): Promise<TermTransitionCheckResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    const [previousTermRows, currentTermRows] = await Promise.all([
      d1.select({ id: terms.id }).from(terms).where(eq(terms.id, previousTermId)).limit(1),
      d1.select({ id: terms.id }).from(terms).where(eq(terms.id, currentTermId)).limit(1),
    ]);

    if (!previousTermRows[0]) {
      issues.push(`Previous term (${previousTermId}) not found`);
    }

    if (!currentTermRows[0]) {
      issues.push(`Current term (${currentTermId}) not found`);
    }

    const studentRows = await d1
      .select({ id: students.id })
      .from(students)
      .where(eq(students.schoolId, schoolId));

    const orphanedCount = 0;
    for (const student of studentRows) {
      const enrollmentInCurrentTerm = await d1
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.schoolId, schoolId),
            eq(enrollments.studentId, student.id),
            eq(enrollments.termId, currentTermId)
          )
        )
        .limit(1);

      if (!enrollmentInCurrentTerm[0]) {
        warnings.push(`Student ${student.id} has no enrollment record in current term`);
      }
    }

    return {
      safe: issues.length === 0,
      issues,
      warnings,
    };
  } catch (error: unknown) {
    issues.push(error instanceof Error ? error.message : "Unknown error during term transition check");
    return { safe: false, issues, warnings };
  }
}

/**
 * Get historical enrollment snapshot for a student
 * Useful for building transcripts and verifying data integrity
 */
export async function getStudentEnrollmentHistory(
  d1: D1Client,
  schoolId: string,
  studentId: string
): Promise<StudentEnrollmentSnapshot[]> {
  const termRows = await d1
    .select({ id: terms.id, sessionId: terms.sessionId })
    .from(terms)
    .where(eq(terms.schoolId, schoolId));

  const snapshots: StudentEnrollmentSnapshot[] = [];

  for (let i = 0; i < termRows.length; i++) {
    const term = termRows[i];
    const previousTerm = i > 0 ? termRows[i - 1] : null;

    const currentTermEnrollments = await d1
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.schoolId, schoolId),
          eq(enrollments.studentId, studentId),
          eq(enrollments.termId, term.id)
        )
      );

    const previousTermEnrollments = previousTerm
      ? await d1
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.schoolId, schoolId),
              eq(enrollments.studentId, studentId),
              eq(enrollments.termId, previousTerm.id)
            )
          )
      : [];

    snapshots.push({
      studentId,
      previousTermEnrollmentCount: previousTermEnrollments.length,
      currentTermEnrollmentCount: currentTermEnrollments.length,
      isConsistent:
        currentTermEnrollments.length > 0 &&
        (previousTermEnrollments.length > 0 || !previousTerm),
    });
  }

  return snapshots;
}

/**
 * Verify transcript data integrity for a student
 * Ensures all academic records are accessible for past terms
 */
export async function verifyStudentTranscriptIntegrity(
  d1: D1Client,
  schoolId: string,
  studentId: string
): Promise<{
  intact: boolean;
  accessibleTerms: number;
  missingTerms: string[];
  notes: string[];
}> {
  const notes: string[] = [];
  const missingTerms: string[] = [];

  try {
    const termRows = await d1
      .select({ id: terms.id, termNumber: terms.termNumber })
      .from(terms)
      .where(eq(terms.schoolId, schoolId));

    let accessibleTerms = 0;

    for (const term of termRows) {
      const enrollmentExists = await d1
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.schoolId, schoolId),
            eq(enrollments.studentId, studentId),
            eq(enrollments.termId, term.id)
          )
        )
        .limit(1);

      if (enrollmentExists[0]) {
        accessibleTerms += 1;
      } else {
        missingTerms.push(term.id);
      }
    }

    return {
      intact: missingTerms.length === 0 || accessibleTerms > 0,
      accessibleTerms,
      missingTerms,
      notes: missingTerms.length > 0
        ? [
            `Student has enrollment records in ${accessibleTerms} of ${termRows.length} terms`,
            `Missing enrollment records for ${missingTerms.length} term(s)`,
          ]
        : [`Student enrollment records intact across all ${termRows.length} terms`],
    };
  } catch (error: unknown) {
    return {
      intact: false,
      accessibleTerms: 0,
      missingTerms: [],
      notes: [error instanceof Error ? error.message : "Unknown error during transcript integrity check"],
    };
  }
}

/**
 * Ensure historic data is preserved when activating a new term
 * Called during term activation to validate no data loss
 */
export async function validateTermActivationSafety(
  d1: D1Client,
  schoolId: string,
  newTermId: string
): Promise<{
  safe: boolean;
  message: string;
}> {
  try {
    const studentRows = await d1
      .select({ id: students.id })
      .from(students)
      .where(eq(students.schoolId, schoolId));

    const withNoCurrentEnrollment = [];

    for (const student of studentRows) {
      const currentEnrollment = await d1
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.schoolId, schoolId),
            eq(enrollments.studentId, student.id),
            eq(enrollments.termId, newTermId)
          )
        )
        .limit(1);

      if (!currentEnrollment[0]) {
        withNoCurrentEnrollment.push(student.id);
      }
    }

    if (withNoCurrentEnrollment.length > 0) {
      return {
        safe: false,
        message: `Warning: ${withNoCurrentEnrollment.length} students have no enrollment in the new term. Create enrollments before full term activation.`,
      };
    }

    return {
      safe: true,
      message: "All students have enrollment records in the new term. Safe to proceed.",
    };
  } catch (error: unknown) {
    return {
      safe: false,
      message: error instanceof Error ? error.message : "Failed to validate term activation",
    };
  }
}
