import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { enrollments, parentWardLinks, students, terms, users } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const profile = await getTeacherProfileData(d1, teacher.schoolId, teacher.userId);
    if (!profile?.classTeacherOf?._id) {
      return NextResponse.json({ classTeacherOf: null, students: [] });
    }

    const currentTermRows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, teacher.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    const currentTermId = currentTermRows[0]?.id;
    if (!currentTermId) {
      return NextResponse.json({ classTeacherOf: profile.classTeacherOf, students: [] });
    }

    const studentRows = await d1
      .select({
        id: students.id,
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
          eq(enrollments.schoolId, teacher.schoolId),
          eq(enrollments.classId, profile.classTeacherOf._id),
          eq(enrollments.termId, currentTermId)
        )
      );

    const studentIds = studentRows.map((row) => row.id);
    const parentLinks = studentIds.length
      ? await d1
          .select({ studentId: parentWardLinks.studentId, parentId: parentWardLinks.parentId, isPrimary: parentWardLinks.isPrimary })
          .from(parentWardLinks)
          .where(and(eq(parentWardLinks.schoolId, teacher.schoolId), inArray(parentWardLinks.studentId, studentIds)))
      : [];

    const parentIds = [...new Set(parentLinks.map((row) => row.parentId))];
    const parentRows = parentIds.length
      ? await d1
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, parentIds))
      : [];

    const parentMap = new Map(parentRows.map((row) => [row.id, row]));
    const preferredParentByStudent = new Map<string, { parentId: string; isPrimary: boolean }>();

    for (const link of parentLinks) {
      const existing = preferredParentByStudent.get(link.studentId);
      if (!existing || (!existing.isPrimary && link.isPrimary)) {
        preferredParentByStudent.set(link.studentId, { parentId: link.parentId, isPrimary: link.isPrimary });
      }
    }

    return NextResponse.json({
      classTeacherOf: profile.classTeacherOf,
      students: studentRows.map((row) => {
        const preferredParent = preferredParentByStudent.get(row.id);
        const parent = preferredParent ? parentMap.get(preferredParent.parentId) : null;
        return {
          _id: row.id,
          id: row.id,
          fullName: `${row.firstName} ${row.lastName}`.trim(),
          admissionNumber: row.admissionNumber,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          parent: parent
            ? { fullName: parent.name, email: parent.email }
            : null,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("Fetch teacher students error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher students" },
      { status: 500 }
    );
  }
}