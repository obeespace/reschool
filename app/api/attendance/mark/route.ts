import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { attendanceRecords, teacherClassAssignments, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

type AttendanceInput = {
  studentId: string;
  status: string;
  excuseReason?: string;
};

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const classId = String(searchParams.get("classId") || "").trim();
    const day = String(searchParams.get("date") || "").trim();

    const termRows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({ attendance: [] });
    }

    if (user.role === "TEACHER" && classId) {
      const assignmentRows = await d1
        .select({ id: teacherClassAssignments.id })
        .from(teacherClassAssignments)
        .where(
          and(
            eq(teacherClassAssignments.schoolId, user.schoolId),
            eq(teacherClassAssignments.teacherId, user.userId),
            eq(teacherClassAssignments.classId, classId)
          )
        )
        .limit(1);

      if (!assignmentRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const rows = await d1
      .select({
        id: attendanceRecords.id,
        classId: attendanceRecords.classId,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
        attendanceDate: attendanceRecords.attendanceDate,
        excuseReason: attendanceRecords.excuseReason,
      })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.schoolId, user.schoolId), eq(attendanceRecords.termId, termRows[0].id)));

    const filtered = rows.filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (day) {
        const rowDay = new Date(Number(row.attendanceDate)).toISOString().slice(0, 10);
        if (rowDay !== day) return false;
      }
      return true;
    });

    return NextResponse.json({ attendance: filtered });
  } catch (error: unknown) {
    console.error("Attendance list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const attendanceDate = String(body?.attendanceDate || "").trim();
    const records: AttendanceInput[] = Array.isArray(body?.records) ? body.records : [];

    if (!classId || !attendanceDate || records.length === 0) {
      return NextResponse.json(
        { error: "classId, attendanceDate and records are required" },
        { status: 400 }
      );
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    if (user.role === "TEACHER") {
      const assignmentRows = await d1
        .select({ id: teacherClassAssignments.id })
        .from(teacherClassAssignments)
        .where(
          and(
            eq(teacherClassAssignments.schoolId, user.schoolId),
            eq(teacherClassAssignments.teacherId, user.userId),
            eq(teacherClassAssignments.classId, classId)
          )
        )
        .limit(1);

      if (!assignmentRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const termRows = await d1
      .select({ id: terms.id, sessionId: terms.sessionId, isClosed: terms.isClosed })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (termRows[0].isClosed) {
      return NextResponse.json({ error: "Cannot mark attendance for a closed term" }, { status: 400 });
    }

    const dateMs = Number(new Date(attendanceDate));
    if (!Number.isFinite(dateMs)) {
      return NextResponse.json({ error: "Invalid attendanceDate" }, { status: 400 });
    }

    const now = new Date();
    let updated = 0;
    let inserted = 0;

    await d1.transaction(async (tx) => {
      for (const record of records) {
        const studentId = String(record?.studentId || "").trim();
        const status = String(record?.status || "").trim().toUpperCase();
        const excuseReason = String(record?.excuseReason || "").trim();

        if (!studentId || !status) continue;

        const existing = await tx
          .select({ id: attendanceRecords.id })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.schoolId, user.schoolId),
              eq(attendanceRecords.studentId, studentId),
              eq(attendanceRecords.termId, termRows[0].id),
              eq(attendanceRecords.attendanceDate, new Date(dateMs))
            )
          )
          .limit(1);

        if (existing[0]) {
          await tx
            .update(attendanceRecords)
            .set({
              status,
              excuseReason: excuseReason || null,
              markedBy: user.userId,
              markedTime: now,
              updatedAt: now,
            })
            .where(eq(attendanceRecords.id, existing[0].id));
          updated += 1;
        } else {
          await tx.insert(attendanceRecords).values({
            id: crypto.randomUUID(),
            schoolId: user.schoolId,
            classId,
            sectionId: null,
            studentId,
            sessionId: termRows[0].sessionId,
            termId: termRows[0].id,
            attendanceDate: new Date(dateMs),
            status,
            excuseReason: excuseReason || null,
            markedBy: user.userId,
            markedTime: now,
            createdAt: now,
            updatedAt: now,
          });
          inserted += 1;
        }
      }
    });

    return NextResponse.json({
      message: "Attendance saved",
      summary: { inserted, updated, totalProcessed: inserted + updated },
    });
  } catch (error: unknown) {
    console.error("Attendance mark error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save attendance" },
      { status: 500 }
    );
  }
}