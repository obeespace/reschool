import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, subjects, teacherSubjectAssignments, users } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const teacherId = String(id || "").trim();
    const body = await req.json();
    const subjectId = String(body?.subjectId || "").trim();
    const classIds = Array.isArray(body?.classIds)
      ? body.classIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!teacherId || !subjectId || classIds.length === 0) {
      return NextResponse.json({ error: "Teacher ID, subject ID, and class IDs are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [teacherRows, subjectRows, classRows] = await Promise.all([
      d1.select({ id: users.id }).from(users).where(and(eq(users.id, teacherId), eq(users.schoolId, admin.schoolId), eq(users.role, "TEACHER"))).limit(1),
      d1.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, admin.schoolId))).limit(1),
      d1.select({ id: classes.id }).from(classes).where(and(eq(classes.schoolId, admin.schoolId), inArray(classes.id, classIds))),
    ]);

    if (!teacherRows[0] || !subjectRows[0] || classRows.length !== classIds.length) {
      return NextResponse.json({ error: "Teacher, subject, or one or more classes were not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.transaction(async (tx) => {
      await tx
        .delete(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.schoolId, admin.schoolId),
            eq(teacherSubjectAssignments.teacherId, teacherId),
            eq(teacherSubjectAssignments.subjectId, subjectId)
          )
        );

      for (const classId of classIds) {
        await tx.insert(teacherSubjectAssignments).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          teacherId,
          subjectId,
          classId,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    return NextResponse.json({ message: "Subject assignment updated successfully" });
  } catch (error: unknown) {
    console.error("Assign subject error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign subject" },
      { status: 500 }
    );
  }
}