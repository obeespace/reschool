import type { D1Client } from "@/app/db/client";
import {
  classes,
  classSubjects,
  enrollments,
  parentWardLinks,
  sections,
  students,
  subjects,
  teacherClassAssignments,
  teacherSubjectAssignments,
  terms,
  users,
} from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export function splitLevelAndArm(className: string, fallbackLevel: string) {
  const normalized = String(className || "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      level: parts.slice(0, -1).join(" ") || fallbackLevel,
      arm: parts[parts.length - 1].toUpperCase(),
    };
  }

  return {
    level: fallbackLevel || normalized,
    arm: "A",
  };
}

export async function getCurrentTermId(d1: D1Client, schoolId: string) {
  const currentTermRows = await d1
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
    .limit(1);

  return currentTermRows[0]?.id || null;
}

export async function getTeacherProfileData(d1: D1Client, schoolId: string, teacherId: string) {
  const teacherRows = await d1
    .select({ id: users.id, fullName: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.id, teacherId), eq(users.role, "TEACHER")))
    .limit(1);

  const teacher = teacherRows[0];
  if (!teacher) {
    return null;
  }

  const [classTeacherRows, subjectAssignmentRows] = await Promise.all([
    d1
      .select({ classId: teacherClassAssignments.classId })
      .from(teacherClassAssignments)
      .where(
        and(
          eq(teacherClassAssignments.schoolId, schoolId),
          eq(teacherClassAssignments.teacherId, teacherId)
        )
      )
      .limit(1),
    d1
      .select({
        subjectId: teacherSubjectAssignments.subjectId,
        classId: teacherSubjectAssignments.classId,
      })
      .from(teacherSubjectAssignments)
      .where(
        and(
          eq(teacherSubjectAssignments.schoolId, schoolId),
          eq(teacherSubjectAssignments.teacherId, teacherId)
        )
      ),
  ]);

  const classIds = [...new Set([
    ...subjectAssignmentRows.map((row) => row.classId),
    ...classTeacherRows.map((row) => row.classId),
  ])];
  const subjectIds = [...new Set(subjectAssignmentRows.map((row) => row.subjectId))];

  const [classRows, subjectRows] = await Promise.all([
    classIds.length
      ? d1
          .select({ id: classes.id, name: classes.name, level: classes.level })
          .from(classes)
          .where(and(eq(classes.schoolId, schoolId), inArray(classes.id, classIds)))
      : Promise.resolve([]),
    subjectIds.length
      ? d1
          .select({ id: subjects.id, name: subjects.name })
          .from(subjects)
          .where(and(eq(subjects.schoolId, schoolId), inArray(subjects.id, subjectIds)))
      : Promise.resolve([]),
  ]);

  const classMap = new Map(
    classRows.map((row) => {
      const parsed = splitLevelAndArm(row.name, row.level);
      return [
        row.id,
        {
          _id: row.id,
          id: row.id,
          name: row.name,
          level: parsed.level,
          arm: parsed.arm,
        },
      ];
    })
  );

  const subjectMap = new Map(
    subjectRows.map((row) => [
      row.id,
      {
        _id: row.id,
        id: row.id,
        name: row.name,
        code: row.name
          .split(/\s+/)
          .map((part) => part[0]?.toUpperCase() || "")
          .join("")
          .slice(0, 6),
      },
    ])
  );

  const groupedAssignments = new Map<string, string[]>();
  for (const row of subjectAssignmentRows) {
    const list = groupedAssignments.get(row.subjectId) || [];
    if (!list.includes(row.classId)) {
      list.push(row.classId);
    }
    groupedAssignments.set(row.subjectId, list);
  }

  const classTeacherOf = classTeacherRows[0]?.classId
    ? classMap.get(classTeacherRows[0].classId) || null
    : null;

  return {
    _id: teacher.id,
    id: teacher.id,
    fullName: teacher.fullName,
    email: teacher.email,
    classTeacherOf,
    subjectsAndClasses: [...groupedAssignments.entries()]
      .map(([subjectId, assignedClassIds]) => {
        const subject = subjectMap.get(subjectId);
        if (!subject) return null;
        return {
          subjectId: subject,
          classIds: assignedClassIds
            .map((classId) => classMap.get(classId))
            .filter((cls): cls is NonNullable<typeof cls> => Boolean(cls)),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  };
}

export async function getParentWardData(d1: D1Client, schoolId: string, parentId: string) {
  const currentTermId = await getCurrentTermId(d1, schoolId);

  const links = await d1
    .select({
      studentId: parentWardLinks.studentId,
      relationship: parentWardLinks.relationship,
      isPrimary: parentWardLinks.isPrimary,
    })
    .from(parentWardLinks)
    .where(and(eq(parentWardLinks.schoolId, schoolId), eq(parentWardLinks.parentId, parentId)));

  const studentIds = links.map((row) => row.studentId);
  if (!studentIds.length) {
    return [];
  }

  const [studentRows, enrollmentRows] = await Promise.all([
    d1
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
      })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds))),
    currentTermId
      ? d1
          .select({
            studentId: enrollments.studentId,
            classId: enrollments.classId,
            sectionId: enrollments.sectionId,
            sectionName: sections.name,
          })
          .from(enrollments)
          .leftJoin(sections, eq(enrollments.sectionId, sections.id))
          .where(
            and(
              eq(enrollments.schoolId, schoolId),
              eq(enrollments.termId, currentTermId),
              inArray(enrollments.studentId, studentIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const classIds = [...new Set(enrollmentRows.map((row) => row.classId))];
  const classRows = classIds.length
    ? await d1
        .select({ id: classes.id, name: classes.name, level: classes.level })
        .from(classes)
        .where(and(eq(classes.schoolId, schoolId), inArray(classes.id, classIds)))
    : [];

  const classMap = new Map(
    classRows.map((row) => {
      const parsed = splitLevelAndArm(row.name, row.level);
      return [row.id, { _id: row.id, id: row.id, name: row.name, level: parsed.level, arm: parsed.arm }];
    })
  );

  const linkMap = new Map(links.map((link) => [link.studentId, link]));
  const enrollmentMap = new Map(enrollmentRows.map((row) => [row.studentId, row]));

  return studentRows.map((student) => {
    const enrollment = enrollmentMap.get(student.id);
    const classData = enrollment?.classId ? classMap.get(enrollment.classId) || null : null;
    return {
      _id: student.id,
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      admissionNumber: student.admissionNumber,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      currentClass: classData,
      currentClassId: classData,
      className: classData?.name || enrollment?.sectionName || "Not assigned",
      relationship: linkMap.get(student.id)?.relationship || "GUARDIAN",
      isPrimary: linkMap.get(student.id)?.isPrimary || false,
      averageScore: null,
      totalSubjects: 0,
    };
  });
}

export async function getClassSubjectIds(d1: D1Client, schoolId: string, classIds: string[]) {
  if (!classIds.length) {
    return new Map<string, string[]>();
  }

  const rows = await d1
    .select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId })
    .from(classSubjects)
    .where(and(eq(classSubjects.schoolId, schoolId), inArray(classSubjects.classId, classIds)));

  const output = new Map<string, string[]>();
  for (const row of rows) {
    const list = output.get(row.classId) || [];
    list.push(row.subjectId);
    output.set(row.classId, list);
  }
  return output;
}