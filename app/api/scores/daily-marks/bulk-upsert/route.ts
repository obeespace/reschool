import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, dailyMarks, teacherSubjectAssignments, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

type Entry = {
  studentId: string;
  score: number;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const type = String(body?.type || "").trim().toLowerCase();
    const maxScore = Number(body?.maxScore || 10);
    const academicYearId = String(body?.academicYearId || "").trim();
    const entries: Entry[] = Array.isArray(body?.entries) ? body.entries : [];

    if (!classId || !subjectId || !type || entries.length === 0) {
      return NextResponse.json(
        { error: "classId, subjectId, type and entries are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      return NextResponse.json({ error: "maxScore must be greater than 0" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "TEACHER") {
      const allowedRows = await d1
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

      if (!allowedRows[0]) {
        return NextResponse.json({ error: "Forbidden: subject/class not assigned" }, { status: 403 });
      }
    }

    let activeTerm = academicYearId
      ? await d1
          .select({ id: terms.id, sessionId: terms.sessionId })
          .from(terms)
          .where(and(eq(terms.schoolId, user.schoolId), eq(terms.sessionId, academicYearId), eq(terms.isCurrent, true)))
          .limit(1)
      : [];

    if (!activeTerm[0]) {
      activeTerm = await d1
        .select({ id: terms.id, sessionId: terms.sessionId })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1);
    }

    if (!activeTerm[0]) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    const termInfoRows = await d1
      .select({ id: terms.id, isPaid: terms.isPaid, isClosed: terms.isClosed })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.id, activeTerm[0].id)))
      .limit(1);

    if (!termInfoRows[0]?.isPaid) {
      return NextResponse.json({ error: "Current term is not paid" }, { status: 400 });
    }

    if (termInfoRows[0].isClosed) {
      return NextResponse.json({ error: "Current term is closed" }, { status: 400 });
    }

    const termId = activeTerm[0].id;
    const sessionId = activeTerm[0].sessionId;
    const now = new Date();

    let totalInserted = 0;
    let totalUpdated = 0;

    await d1.transaction(async (tx) => {
      for (const entry of entries) {
        const studentId = String(entry?.studentId || "").trim();
        const score = Number(entry?.score);
        const notes = String(entry?.notes || "").trim();

        if (!studentId || !Number.isFinite(score)) {
          continue;
        }

        const existing = await tx
          .select({ id: dailyMarks.id })
          .from(dailyMarks)
          .where(
            and(
              eq(dailyMarks.schoolId, user.schoolId),
              eq(dailyMarks.studentId, studentId),
              eq(dailyMarks.classId, classId),
              eq(dailyMarks.subjectId, subjectId),
              eq(dailyMarks.termId, termId),
              eq(dailyMarks.assessmentType, type),
              eq(dailyMarks.isDeleted, false)
            )
          )
          .limit(1);

        if (existing[0]) {
          await tx
            .update(dailyMarks)
            .set({
              score,
              maxScore,
              weightage: 1,
              feedbackNotes: notes || null,
              lastModifiedBy: user.userId,
              updatedAt: now,
            })
            .where(eq(dailyMarks.id, existing[0].id));
          totalUpdated += 1;
        } else {
          await tx.insert(dailyMarks).values({
            id: crypto.randomUUID(),
            schoolId: user.schoolId,
            studentId,
            subjectId,
            classId,
            sectionId: null,
            teacherId: user.userId,
            sessionId,
            termId,
            assessmentType: type,
            score,
            maxScore,
            weightage: 1,
            feedbackNotes: notes || null,
            modificationHistoryJson: "[]",
            recordedDate: now,
            recordedBy: user.userId,
            lastModifiedBy: user.userId,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });
          totalInserted += 1;
        }
      }
    });

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "DAILY_MARKS_BULK_UPSERT",
      metaJson: JSON.stringify({
        classId,
        subjectId,
        type,
        termId,
        sessionId,
        requestedEntries: entries.length,
        inserted: totalInserted,
        updated: totalUpdated,
      }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({
      message: "Daily marks saved successfully",
      summary: {
        totalProcessed: totalInserted + totalUpdated,
        inserted: totalInserted,
        updated: totalUpdated,
      },
    });
  } catch (error: unknown) {
    console.error("Bulk upsert daily marks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save daily marks" },
      { status: 500 }
    );
  }
}