import { getOptionalD1Client } from "@/app/db/runtime";
import { teacherClassAssignments, teacherSubjectAssignments, users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

async function getTeacherSchoolId(userId: string): Promise<string | null> {
  const d1 = getOptionalD1Client();
  if (!d1) {
    return null;
  }

  const rows = await d1
    .select({ schoolId: users.schoolId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0]?.schoolId || null;
}

/**
 * Check if a teacher is the class teacher of a specific class
 */
export async function isClassTeacher(userId: string, classId: string): Promise<boolean> {
  const d1 = getOptionalD1Client();
  if (!d1) {
    return false;
  }

  const schoolId = await getTeacherSchoolId(userId);
  if (!schoolId) {
    return false;
  }

  const rows = await d1
    .select({ id: teacherClassAssignments.id })
    .from(teacherClassAssignments)
    .where(
      and(
        eq(teacherClassAssignments.schoolId, schoolId),
        eq(teacherClassAssignments.teacherId, userId),
        eq(teacherClassAssignments.classId, classId)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Check if a teacher teaches a subject in a specific class
 */
export async function teachesSubjectInClass(
  userId: string,
  subjectId: string,
  classId: string
): Promise<boolean> {
  const d1 = getOptionalD1Client();
  if (!d1) {
    return false;
  }

  const schoolId = await getTeacherSchoolId(userId);
  if (!schoolId) {
    return false;
  }

  const rows = await d1
    .select({ id: teacherSubjectAssignments.id })
    .from(teacherSubjectAssignments)
    .where(
      and(
        eq(teacherSubjectAssignments.schoolId, schoolId),
        eq(teacherSubjectAssignments.teacherId, userId),
        eq(teacherSubjectAssignments.subjectId, subjectId),
        eq(teacherSubjectAssignments.classId, classId)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Get all classes a teacher teaches (either as class teacher or subject teacher)
 */
export async function getTeacherClasses(userId: string): Promise<string[]> {
  const d1 = getOptionalD1Client();
  if (!d1) {
    return [];
  }

  const schoolId = await getTeacherSchoolId(userId);
  if (!schoolId) {
    return [];
  }

  const [classTeacherRows, subjectRows] = await Promise.all([
    d1
      .select({ classId: teacherClassAssignments.classId })
      .from(teacherClassAssignments)
      .where(
        and(
          eq(teacherClassAssignments.schoolId, schoolId),
          eq(teacherClassAssignments.teacherId, userId)
        )
      ),
    d1
      .select({ classId: teacherSubjectAssignments.classId })
      .from(teacherSubjectAssignments)
      .where(
        and(
          eq(teacherSubjectAssignments.schoolId, schoolId),
          eq(teacherSubjectAssignments.teacherId, userId)
        )
      ),
  ]);

  return [...new Set([...classTeacherRows.map((row) => row.classId), ...subjectRows.map((row) => row.classId)])];
}

/**
 * Get all subjects a teacher teaches
 */
export async function getTeacherSubjects(userId: string): Promise<string[]> {
  const d1 = getOptionalD1Client();
  if (!d1) {
    return [];
  }

  const schoolId = await getTeacherSchoolId(userId);
  if (!schoolId) {
    return [];
  }

  const rows = await d1
    .select({ subjectId: teacherSubjectAssignments.subjectId })
    .from(teacherSubjectAssignments)
    .where(
      and(
        eq(teacherSubjectAssignments.schoolId, schoolId),
        eq(teacherSubjectAssignments.teacherId, userId)
      )
    );

  return [...new Set(rows.map((row) => row.subjectId))];
}
