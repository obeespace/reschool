import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { teacherClassAssignments, teacherSubjectAssignments, users } from "@/app/db/schema";
import { getTeacherProfileData } from "@/app/utils/schoolRelationships";
import { and, eq } from "drizzle-orm";

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
    if (!profile) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ ...profile, isActive: true });
  } catch (error: unknown) {
    console.error("Fetch teacher assignments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher assignments" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const teacherId = String(body?.teacherId || "").trim();
    const classTeacherOf = body?.classTeacherOf ? String(body.classTeacherOf).trim() : "";
    const subjectsAndClasses = Array.isArray(body?.subjectsAndClasses) ? body.subjectsAndClasses : [];

    if (!teacherId) {
      return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
    }

    const teacherRows = await d1
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.id, teacherId), eq(users.role, "TEACHER")))
      .limit(1);

    if (!teacherRows[0]) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.transaction(async (tx) => {
      await tx
        .delete(teacherClassAssignments)
        .where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.teacherId, teacherId)));

      if (classTeacherOf) {
        await tx
          .delete(teacherClassAssignments)
          .where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.classId, classTeacherOf)));

        await tx.insert(teacherClassAssignments).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          teacherId,
          classId: classTeacherOf,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx
        .delete(teacherSubjectAssignments)
        .where(and(eq(teacherSubjectAssignments.schoolId, admin.schoolId), eq(teacherSubjectAssignments.teacherId, teacherId)));

      const subjectAssignmentRows: Array<{
        id: string;
        schoolId: string;
        teacherId: string;
        subjectId: string;
        classId: string;
        createdAt: Date;
        updatedAt: Date;
      }> = [];

      const seenPairs = new Set<string>();

      for (const assignment of subjectsAndClasses) {
        const subjectId = String(assignment?.subjectId || "").trim();
        const classIds = Array.isArray(assignment?.classIds) ? assignment.classIds : [];
        if (!subjectId) continue;

        for (const classIdValue of classIds) {
          const classId = String(classIdValue || "").trim();
          if (!classId) continue;

          const pairKey = `${subjectId}:${classId}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          subjectAssignmentRows.push({
            id: crypto.randomUUID(),
            schoolId: admin.schoolId,
            teacherId,
            subjectId,
            classId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (subjectAssignmentRows.length > 0) {
        await tx.insert(teacherSubjectAssignments).values(subjectAssignmentRows);
      }
    });

    const profile = await getTeacherProfileData(d1, admin.schoolId, teacherId);
    return NextResponse.json({ message: "Teacher assignments updated", teacher: profile });
  } catch (error: unknown) {
    console.error("Update teacher assignments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update teacher assignments" },
      { status: 500 }
    );
  }
}