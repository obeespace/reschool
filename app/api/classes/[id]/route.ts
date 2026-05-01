import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import {
  classes,
  classSubjects,
  enrollments,
  parentWardLinks,
  students,
  subjects,
  teacherClassAssignments,
  teacherSubjectAssignments,
  terms,
  users,
} from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { splitLevelAndArm } from "@/app/utils/schoolRelationships";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const classId = String(id || "").trim();
    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const classRows = await d1
      .select({ id: classes.id, name: classes.name, level: classes.level })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, user.schoolId)))
      .limit(1);

    if (!classRows[0]) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const currentTermRows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    const currentTermId = currentTermRows[0]?.id;

    const [classTeacherRows, classSubjectRows] = await Promise.all([
      d1
        .select({ teacherId: teacherClassAssignments.teacherId })
        .from(teacherClassAssignments)
        .where(and(eq(teacherClassAssignments.schoolId, user.schoolId), eq(teacherClassAssignments.classId, classId)))
        .limit(1),
      d1
        .select({ subjectId: classSubjects.subjectId })
        .from(classSubjects)
        .where(and(eq(classSubjects.schoolId, user.schoolId), eq(classSubjects.classId, classId))),
    ]);

    const subjectIds = classSubjectRows.map((row) => row.subjectId);
    const subjectRows = subjectIds.length
      ? await d1
          .select({ id: subjects.id, name: subjects.name })
          .from(subjects)
          .where(and(eq(subjects.schoolId, user.schoolId), inArray(subjects.id, subjectIds)))
      : [];

    const teacherRows = classTeacherRows[0]?.teacherId
      ? await d1
          .select({ id: users.id, fullName: users.name, email: users.email })
          .from(users)
          .where(
            and(
              eq(users.schoolId, user.schoolId),
              eq(users.id, classTeacherRows[0].teacherId),
              eq(users.role, "TEACHER")
            )
          )
          .limit(1)
      : [];

    const enrollRows = currentTermId
      ? await d1
          .select({
            studentId: enrollments.studentId,
            firstName: students.firstName,
            lastName: students.lastName,
            admissionNumber: students.admissionNumber,
            gender: students.gender,
            dateOfBirth: students.dateOfBirth,
          })
          .from(enrollments)
          .innerJoin(students, eq(enrollments.studentId, students.id))
          .where(
            and(
              eq(enrollments.schoolId, user.schoolId),
              eq(enrollments.classId, classId),
              eq(enrollments.termId, currentTermId)
            )
          )
      : [];

    const studentIds = enrollRows.map((row) => row.studentId);
    const wardLinks = studentIds.length
      ? await d1
          .select({ studentId: parentWardLinks.studentId, parentId: parentWardLinks.parentId, isPrimary: parentWardLinks.isPrimary })
          .from(parentWardLinks)
          .where(and(eq(parentWardLinks.schoolId, user.schoolId), inArray(parentWardLinks.studentId, studentIds)))
      : [];

    const parentIds = [...new Set(wardLinks.map((row) => row.parentId))];
    const parentRows = parentIds.length
      ? await d1
          .select({ id: users.id, fullName: users.name, email: users.email })
          .from(users)
          .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "PARENT"), inArray(users.id, parentIds)))
      : [];

    const parentMap = new Map(parentRows.map((row) => [row.id, row]));
    const parentByStudent = new Map<string, string>();
    for (const link of wardLinks) {
      if (!parentByStudent.has(link.studentId) || link.isPrimary) {
        parentByStudent.set(link.studentId, link.parentId);
      }
    }

    const subjectTeacherRows = subjectIds.length
      ? await d1
          .select({
            subjectId: teacherSubjectAssignments.subjectId,
            teacherId: teacherSubjectAssignments.teacherId,
          })
          .from(teacherSubjectAssignments)
          .where(
            and(
              eq(teacherSubjectAssignments.schoolId, user.schoolId),
              eq(teacherSubjectAssignments.classId, classId),
              inArray(teacherSubjectAssignments.subjectId, subjectIds)
            )
          )
      : [];

    const subjectTeacherIds = [...new Set(subjectTeacherRows.map((row) => row.teacherId))];
    const subjectTeacherUsers = subjectTeacherIds.length
      ? await d1
          .select({ id: users.id, fullName: users.name, email: users.email })
          .from(users)
          .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "TEACHER"), inArray(users.id, subjectTeacherIds)))
      : [];

    const subjectMap = new Map(
      subjectRows.map((row) => [
        row.id,
        {
          _id: row.id,
          name: row.name,
          code: row.name
            .split(/\s+/)
            .map((part) => part[0]?.toUpperCase() || "")
            .join("")
            .slice(0, 6),
        },
      ])
    );

    const teacherMap = new Map(subjectTeacherUsers.map((row) => [row.id, row]));
    const parsedClass = splitLevelAndArm(classRows[0].name, classRows[0].level);

    const studentsPayload = enrollRows.map((row) => {
      const parentId = parentByStudent.get(row.studentId);
      const parent = parentId ? parentMap.get(parentId) : null;
      return {
        _id: row.studentId,
        fullName: `${row.firstName} ${row.lastName}`.trim(),
        registrationNumber: row.admissionNumber,
        gender: row.gender || "N/A",
        dateOfBirth: row.dateOfBirth,
        parent: parent
          ? {
              fullName: parent.fullName,
              email: parent.email,
            }
          : null,
      };
    });

    const maleStudents = studentsPayload.filter((student) => String(student.gender).toUpperCase() === "MALE").length;
    const femaleStudents = studentsPayload.filter((student) => String(student.gender).toUpperCase() === "FEMALE").length;

    return NextResponse.json({
      class: {
        _id: classRows[0].id,
        name: classRows[0].name,
        level: parsedClass.level,
        arm: parsedClass.arm,
        classTeacher: teacherRows[0]
          ? {
              _id: teacherRows[0].id,
              fullName: teacherRows[0].fullName,
              email: teacherRows[0].email,
            }
          : null,
        subjects: subjectIds.map((subjectId) => subjectMap.get(subjectId)).filter(Boolean),
        students: studentsPayload,
        subjectTeachers: subjectTeacherRows
          .map((row) => {
            const subject = subjectMap.get(row.subjectId);
            const teacher = teacherMap.get(row.teacherId);
            if (!subject || !teacher) return null;
            return {
              subject,
              teacher: {
                _id: teacher.id,
                fullName: teacher.fullName,
                email: teacher.email,
              },
            };
          })
          .filter(Boolean),
        stats: {
          totalStudents: studentsPayload.length,
          maleStudents,
          femaleStudents,
          totalSubjects: subjectIds.length,
          hasClassTeacher: Boolean(teacherRows[0]),
        },
      },
    });
  } catch (error: unknown) {
    console.error("Class details error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch class details" },
      { status: 500 }
    );
  }
}