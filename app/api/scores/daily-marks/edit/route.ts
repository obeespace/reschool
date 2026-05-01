import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, dailyMarks, teacherSubjectAssignments, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || "").trim();
    const score = body?.score;
    const maxScore = body?.maxScore;
    const feedbackNotes = body?.feedbackNotes;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const markRows = await d1
      .select({
        id: dailyMarks.id,
        classId: dailyMarks.classId,
        subjectId: dailyMarks.subjectId,
        studentId: dailyMarks.studentId,
        termId: dailyMarks.termId,
        currentScore: dailyMarks.score,
        currentMaxScore: dailyMarks.maxScore,
        currentFeedbackNotes: dailyMarks.feedbackNotes,
      })
      .from(dailyMarks)
      .where(and(eq(dailyMarks.id, id), eq(dailyMarks.schoolId, user.schoolId), eq(dailyMarks.isDeleted, false)))
      .limit(1);

    const mark = markRows[0];
    if (!mark) {
      return NextResponse.json({ error: "Daily mark not found" }, { status: 404 });
    }

    if (user.role === "TEACHER") {
      const assignmentRows = await d1
        .select({ id: teacherSubjectAssignments.id })
        .from(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.schoolId, user.schoolId),
            eq(teacherSubjectAssignments.teacherId, user.userId),
            eq(teacherSubjectAssignments.classId, mark.classId),
            eq(teacherSubjectAssignments.subjectId, mark.subjectId)
          )
        )
        .limit(1);

      if (!assignmentRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const termRows = await d1
      .select({ id: terms.id, isPaid: terms.isPaid, isClosed: terms.isClosed })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.id, mark.termId)))
      .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({ error: "Associated term not found" }, { status: 400 });
    }

    if (!termRows[0].isPaid) {
      return NextResponse.json({ error: "Associated term is not paid" }, { status: 400 });
    }

    if (termRows[0].isClosed) {
      return NextResponse.json({ error: "Associated term is closed" }, { status: 400 });
    }

    const now = new Date();
    await d1
      .update(dailyMarks)
      .set({
        score: Number.isFinite(Number(score)) ? Number(score) : undefined,
        maxScore: Number.isFinite(Number(maxScore)) ? Number(maxScore) : undefined,
        feedbackNotes: typeof feedbackNotes === "string" ? feedbackNotes : undefined,
        lastModifiedBy: user.userId,
        updatedAt: now,
      })
      .where(eq(dailyMarks.id, id));

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "DAILY_MARK_EDITED",
      metaJson: JSON.stringify({
        markId: id,
        studentId: mark.studentId,
        classId: mark.classId,
        subjectId: mark.subjectId,
        termId: mark.termId,
        before: {
          score: mark.currentScore,
          maxScore: mark.currentMaxScore,
          feedbackNotes: mark.currentFeedbackNotes,
        },
        after: {
          score: Number.isFinite(Number(score)) ? Number(score) : mark.currentScore,
          maxScore: Number.isFinite(Number(maxScore)) ? Number(maxScore) : mark.currentMaxScore,
          feedbackNotes: typeof feedbackNotes === "string" ? feedbackNotes : mark.currentFeedbackNotes,
        },
      }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({ message: "Daily mark updated" });
  } catch (error: unknown) {
    console.error("Edit daily mark error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to edit daily mark" },
      { status: 500 }
    );
  }
}