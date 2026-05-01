import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, dailyMarks, teacherSubjectAssignments, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || "").trim();
    const classId = String(body?.classId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const type = String(body?.type || "").trim().toLowerCase();

    if (!id && !(classId && subjectId && type)) {
      return NextResponse.json(
        { error: "Provide id or (classId, subjectId, type) to clear marks" },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "TEACHER" && classId && subjectId) {
      const assignmentRows = await d1
        .select({ id: teacherSubjectAssignments.id })
        .from(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.schoolId, user.schoolId),
            eq(teacherSubjectAssignments.teacherId, user.userId),
            eq(teacherSubjectAssignments.classId, classId),
            eq(teacherSubjectAssignments.subjectId, subjectId)
          )
        )
        .limit(1);

      if (!assignmentRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (id && user.role === "TEACHER") {
      const markRows = await d1
        .select({ classId: dailyMarks.classId, subjectId: dailyMarks.subjectId })
        .from(dailyMarks)
        .where(and(eq(dailyMarks.id, id), eq(dailyMarks.schoolId, user.schoolId), eq(dailyMarks.isDeleted, false)))
        .limit(1);

      if (!markRows[0]) {
        return NextResponse.json({ error: "Daily mark not found" }, { status: 404 });
      }

      const assignmentRows = await d1
        .select({ id: teacherSubjectAssignments.id })
        .from(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.schoolId, user.schoolId),
            eq(teacherSubjectAssignments.teacherId, user.userId),
            eq(teacherSubjectAssignments.classId, markRows[0].classId),
            eq(teacherSubjectAssignments.subjectId, markRows[0].subjectId)
          )
        )
        .limit(1);

      if (!assignmentRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const currentTermRows = await d1
      .select({ id: terms.id, isPaid: terms.isPaid, isClosed: terms.isClosed })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!currentTermRows[0]) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (!currentTermRows[0].isPaid) {
      return NextResponse.json({ error: "Current term is not paid" }, { status: 400 });
    }

    if (currentTermRows[0].isClosed) {
      return NextResponse.json({ error: "Current term is closed" }, { status: 400 });
    }

    const now = new Date();
    if (id) {
      await d1
        .update(dailyMarks)
        .set({ isDeleted: true, lastModifiedBy: user.userId, updatedAt: now })
        .where(
          and(
            eq(dailyMarks.id, id),
            eq(dailyMarks.schoolId, user.schoolId),
            eq(dailyMarks.termId, currentTermRows[0].id),
            eq(dailyMarks.isDeleted, false)
          )
        );

      await d1.insert(auditLogs).values({
        id: crypto.randomUUID(),
        schoolId: user.schoolId,
        actorId: user.userId,
        action: "DAILY_MARK_CLEARED",
        metaJson: JSON.stringify({ markId: id, termId: currentTermRows[0].id }),
        createdAt: now,
        updatedAt: now,
      });

      invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
      invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
      invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);
      return NextResponse.json({ message: "Daily mark cleared" });
    }

    await d1
      .update(dailyMarks)
      .set({ isDeleted: true, lastModifiedBy: user.userId, updatedAt: now })
      .where(
        and(
          eq(dailyMarks.schoolId, user.schoolId),
          eq(dailyMarks.classId, classId),
          eq(dailyMarks.subjectId, subjectId),
          eq(dailyMarks.assessmentType, type),
          eq(dailyMarks.termId, currentTermRows[0].id),
          eq(dailyMarks.isDeleted, false)
        )
      );

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "DAILY_MARKS_CLEARED",
      metaJson: JSON.stringify({
        classId,
        subjectId,
        type,
        termId: currentTermRows[0].id,
      }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({ message: "Daily marks cleared" });
  } catch (error: unknown) {
    console.error("Clear daily marks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear daily marks" },
      { status: 500 }
    );
  }
}