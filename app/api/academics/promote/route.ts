import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, enrollments, studentLifecycleRecords, students, terms } from "@/app/db/schema";
import { appendMilestone, formatMilestone, parseMilestones } from "@/app/utils/lifecycleMilestones";
import { and, eq, inArray } from "drizzle-orm";

async function resolveActiveTermAndSession(d1: ReturnType<typeof getOptionalD1Client>, schoolId: string) {
  if (!d1) return null;
  const termRows = await d1
    .select({ id: terms.id, sessionId: terms.sessionId, termNumber: terms.termNumber })
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
    .limit(1);

  return termRows[0] || null;
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const fromClassId = String(searchParams.get("fromClassId") || "").trim();
    const toClassId = String(searchParams.get("toClassId") || "").trim();
    const termId = String(searchParams.get("termId") || "").trim();
    const sessionId = String(searchParams.get("sessionId") || "").trim();
    const fromSectionId = String(searchParams.get("fromSectionId") || "").trim();

    if (!fromClassId) {
      return NextResponse.json({ error: "fromClassId is required" }, { status: 400 });
    }

    const active = await resolveActiveTermAndSession(d1, user.schoolId);
    const effectiveTermId = termId || active?.id;
    const effectiveSessionId = sessionId || active?.sessionId;

    if (!effectiveTermId || !effectiveSessionId) {
      return NextResponse.json({ error: "No active term/session found" }, { status: 400 });
    }

    const enrollmentRows = await d1
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.schoolId, user.schoolId),
          eq(enrollments.classId, fromClassId),
          eq(enrollments.sessionId, effectiveSessionId),
          eq(enrollments.termId, effectiveTermId)
        )
      );

    const filteredRows = fromSectionId
      ? enrollmentRows.filter((entry) => String(entry.sectionId || "") === fromSectionId)
      : enrollmentRows;

    const studentIds = [...new Set(filteredRows.map((row) => row.studentId))];
    const studentRows = studentIds.length
      ? await d1
          .select({
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
            admissionNumber: students.admissionNumber,
          })
          .from(students)
          .where(and(eq(students.schoolId, user.schoolId), inArray(students.id, studentIds)))
      : [];

    const targetExisting = toClassId
      ? await d1
          .select({ studentId: enrollments.studentId })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.schoolId, user.schoolId),
              eq(enrollments.classId, toClassId),
              eq(enrollments.sessionId, effectiveSessionId),
              eq(enrollments.termId, effectiveTermId)
            )
          )
      : [];
    const targetSet = new Set(targetExisting.map((row) => row.studentId));

    return NextResponse.json({
      fromClassId,
      toClassId: toClassId || null,
      termId: effectiveTermId,
      sessionId: effectiveSessionId,
      eligibleCount: studentRows.length,
      students: studentRows.map((student) => ({
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        alreadyInTargetClass: toClassId ? targetSet.has(student.id) : false,
      })),
    });
  } catch (error: unknown) {
    console.error("Promotion preview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview promotion" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const fromClassId = String(body?.fromClassId || "").trim();
    const toClassId = String(body?.toClassId || "").trim();
    const fromSectionId = String(body?.fromSectionId || "").trim();
    const toSectionIdRaw = String(body?.toSectionId || "").trim();
    const toSectionId = toSectionIdRaw || null;
    const sourceTermId = String(body?.sourceTermId || "").trim();
    const sourceSessionId = String(body?.sourceSessionId || "").trim();
    const targetTermId = String(body?.targetTermId || "").trim();
    const targetSessionId = String(body?.targetSessionId || "").trim();
    const studentIds = Array.isArray(body?.studentIds)
      ? body.studentIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!fromClassId || !toClassId) {
      return NextResponse.json({ error: "fromClassId and toClassId are required" }, { status: 400 });
    }

    const active = await resolveActiveTermAndSession(d1, user.schoolId);
    const effectiveSourceTermId = sourceTermId || active?.id;
    const effectiveSourceSessionId = sourceSessionId || active?.sessionId;
    const effectiveTargetTermId = targetTermId || active?.id;
    const effectiveTargetSessionId = targetSessionId || active?.sessionId;

    if (
      !effectiveSourceTermId ||
      !effectiveSourceSessionId ||
      !effectiveTargetTermId ||
      !effectiveTargetSessionId
    ) {
      return NextResponse.json({ error: "Unable to resolve source/target term and session" }, { status: 400 });
    }

    const classRows = await d1
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(eq(classes.schoolId, user.schoolId), inArray(classes.id, [fromClassId, toClassId])));

    const classMap = new Map(classRows.map((row) => [row.id, row.name]));
    if (!classMap.has(fromClassId) || !classMap.has(toClassId)) {
      return NextResponse.json({ error: "Invalid class mapping" }, { status: 400 });
    }

    const sourceRows = await d1
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        sectionId: enrollments.sectionId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.schoolId, user.schoolId),
          eq(enrollments.classId, fromClassId),
          eq(enrollments.sessionId, effectiveSourceSessionId),
          eq(enrollments.termId, effectiveSourceTermId)
        )
      );

    const eligibleRows = sourceRows.filter((row) => {
      if (fromSectionId && String(row.sectionId || "") !== fromSectionId) return false;
      if (studentIds.length > 0 && !studentIds.includes(row.studentId)) return false;
      return true;
    });

    if (eligibleRows.length === 0) {
      return NextResponse.json({ message: "No students found for promotion", promoted: 0 });
    }

    const uniqueStudentIds = [...new Set(eligibleRows.map((row) => row.studentId))];
    const existingTargetRows = await d1
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.schoolId, user.schoolId),
          eq(enrollments.sessionId, effectiveTargetSessionId),
          eq(enrollments.termId, effectiveTargetTermId),
          inArray(enrollments.studentId, uniqueStudentIds)
        )
      );
    const existingByStudent = new Map(existingTargetRows.map((row) => [row.studentId, row.id]));

    const now = new Date();
    let inserted = 0;
    let updated = 0;

    await d1.transaction(async (tx) => {
      for (const row of eligibleRows) {
        const existingId = existingByStudent.get(row.studentId);

        if (existingId) {
          await tx
            .update(enrollments)
            .set({
              classId: toClassId,
              sectionId: toSectionId,
              updatedAt: now,
            })
            .where(eq(enrollments.id, existingId));
          updated += 1;
        } else {
          await tx.insert(enrollments).values({
            id: crypto.randomUUID(),
            schoolId: user.schoolId,
            studentId: row.studentId,
            classId: toClassId,
            sectionId: toSectionId,
            sessionId: effectiveTargetSessionId,
            termId: effectiveTargetTermId,
            createdAt: now,
            updatedAt: now,
          });
          inserted += 1;
        }

        const lifecycleRows = await tx
          .select({ id: studentLifecycleRecords.id, milestonesJson: studentLifecycleRecords.milestonesJson })
          .from(studentLifecycleRecords)
          .where(
            and(
              eq(studentLifecycleRecords.schoolId, user.schoolId),
              eq(studentLifecycleRecords.studentId, row.studentId)
            )
          )
          .limit(1);

        if (lifecycleRows[0]) {
          const nextClassName = classMap.get(toClassId) || classMap.get(fromClassId) || "";
          const milestones = appendMilestone(
            parseMilestones(lifecycleRows[0].milestonesJson),
            formatMilestone(`Promoted to ${nextClassName}`, now)
          );
          await tx
            .update(studentLifecycleRecords)
            .set({
              currentClass: nextClassName,
              milestonesJson: JSON.stringify(milestones),
              updatedAt: now,
            })
            .where(eq(studentLifecycleRecords.id, lifecycleRows[0].id));
        }
      }
    });

    return NextResponse.json({
      message: "Promotion completed",
      promoted: inserted + updated,
      inserted,
      updated,
      source: {
        classId: fromClassId,
        sessionId: effectiveSourceSessionId,
        termId: effectiveSourceTermId,
      },
      target: {
        classId: toClassId,
        sectionId: toSectionId,
        sessionId: effectiveTargetSessionId,
        termId: effectiveTargetTermId,
      },
    });
  } catch (error: unknown) {
    console.error("Promotion execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to promote students" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}