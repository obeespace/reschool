import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, results, teacherSubjectAssignments, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

type UploadEntry = {
  studentId: string;
  score: number;
  sectionId?: string;
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
    const entries: UploadEntry[] = Array.isArray(body?.entries) ? body.entries : [];

    if (!classId || !subjectId || entries.length === 0) {
      return NextResponse.json({ error: "classId, subjectId and entries are required" }, { status: 400 });
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
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    let inserted = 0;
    let updated = 0;

    await d1.transaction(async (tx) => {
      for (const entry of entries) {
        const studentId = String(entry?.studentId || "").trim();
        const score = Number(entry?.score);
        const sectionId = entry?.sectionId ? String(entry.sectionId).trim() : null;

        if (!studentId || !Number.isFinite(score)) continue;

        const existing = await tx
          .select({ id: results.id })
          .from(results)
          .where(
            and(
              eq(results.schoolId, user.schoolId),
              eq(results.studentId, studentId),
              eq(results.subjectId, subjectId),
              eq(results.classId, classId),
              eq(results.sessionId, termRows[0].sessionId),
              eq(results.termId, termRows[0].id)
            )
          )
          .limit(1);

        if (existing[0]) {
          await tx
            .update(results)
            .set({ score, sectionId, updatedAt: now })
            .where(eq(results.id, existing[0].id));
          updated += 1;
        } else {
          await tx.insert(results).values({
            id: crypto.randomUUID(),
            schoolId: user.schoolId,
            studentId,
            subjectId,
            classId,
            sectionId,
            sessionId: termRows[0].sessionId,
            termId: termRows[0].id,
            score,
            createdAt: now,
            updatedAt: now,
          });
          inserted += 1;
        }
      }
    });

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "ACADEMIC_RESULTS_UPSERT",
      metaJson: JSON.stringify({
        classId,
        subjectId,
        termId: termRows[0].id,
        sessionId: termRows[0].sessionId,
        requestedEntries: entries.length,
        inserted,
        updated,
      }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`parents:class-ranking:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${user.schoolId}:`);
    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({
      message: "Scores uploaded successfully",
      summary: { inserted, updated, totalProcessed: inserted + updated },
    });
  } catch (error: unknown) {
    console.error("Scores upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload scores" },
      { status: 500 }
    );
  }
}