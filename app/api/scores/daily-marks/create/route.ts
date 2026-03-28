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
    const studentId = String(body?.studentId || "").trim();
    const classId = String(body?.classId || "").trim();
    const subjectId = String(body?.subjectId || "").trim();
    const assessmentType = String(body?.type || body?.assessmentType || "classwork").trim().toLowerCase();
    const score = Number(body?.score);
    const maxScore = Number(body?.maxScore || 10);
    const feedbackNotes = String(body?.feedbackNotes || body?.notes || "").trim();

    if (!studentId || !classId || !subjectId || !Number.isFinite(score) || !Number.isFinite(maxScore)) {
      return NextResponse.json(
        { error: "studentId, classId, subjectId, score and maxScore are required" },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "TEACHER") {
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
        return NextResponse.json({ error: "Forbidden: subject/class not assigned" }, { status: 403 });
      }
    }

    const termRows = await d1
      .select({ id: terms.id, sessionId: terms.sessionId, isPaid: terms.isPaid, isClosed: terms.isClosed })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (!termRows[0].isPaid) {
      return NextResponse.json({ error: "Current term is not paid" }, { status: 400 });
    }

    if (termRows[0].isClosed) {
      return NextResponse.json({ error: "Current term is closed" }, { status: 400 });
    }

    const now = new Date();
    const created = await d1.insert(dailyMarks).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      studentId,
      subjectId,
      classId,
      sectionId: null,
      teacherId: user.userId,
      sessionId: termRows[0].sessionId,
      termId: termRows[0].id,
      assessmentType,
      score,
      maxScore,
      weightage: 1,
      feedbackNotes: feedbackNotes || null,
      modificationHistoryJson: "[]",
      recordedDate: now,
      recordedBy: user.userId,
      lastModifiedBy: user.userId,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: dailyMarks.id });

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "DAILY_MARK_CREATED",
      metaJson: JSON.stringify({
        markId: created[0]?.id || null,
        studentId,
        classId,
        subjectId,
        termId: termRows[0].id,
        score,
        maxScore,
      }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({ message: "Daily mark created", id: created[0]?.id || null });
  } catch (error: unknown) {
    console.error("Create daily mark error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create daily mark" },
      { status: 500 }
    );
  }
}