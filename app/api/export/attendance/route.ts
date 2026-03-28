import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { attendanceRecords, classes, sessions, students, terms } from "@/app/db/schema";
import { and, asc, eq } from "drizzle-orm";

type AttendanceExportRow = {
  attendanceId: string;
  date: Date | null;
  session: string;
  term: number;
  className: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  status: string;
  excuseReason: string;
};

function buildCsv(rows: AttendanceExportRow[]): string {
  const header = [
    "Attendance ID",
    "Date",
    "Session",
    "Term",
    "Class",
    "Student ID",
    "Student Name",
    "Admission Number",
    "Status",
    "Excuse Reason",
  ];

  const data = rows.map((row) =>
    [
      row.attendanceId,
      row.date ? row.date.toISOString().slice(0, 10) : "",
      row.session,
      String(row.term),
      row.className,
      row.studentId,
      row.studentName,
      row.admissionNumber,
      row.status,
      row.excuseReason,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header.join(","), ...data].join("\n");
}

async function handleExport(req: Request, payload: { classId?: string; termId?: string; studentId?: string; format?: string }) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: ITokenPayload | null = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const d1 = getOptionalD1Client();
  if (!d1) {
    return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
  }

  const classId = String(payload.classId || "").trim();
  const studentId = String(payload.studentId || "").trim();
  const resolvedTermId = String(payload.termId || "").trim() || (
    await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
      .limit(1)
  )[0]?.id || "";

  const rows = resolvedTermId
    ? await d1
        .select({
          id: attendanceRecords.id,
          attendanceDate: attendanceRecords.attendanceDate,
          status: attendanceRecords.status,
          excuseReason: attendanceRecords.excuseReason,
          studentId: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
          classId: classes.id,
          className: classes.name,
          termNumber: terms.termNumber,
          sessionYear: sessions.year,
        })
        .from(attendanceRecords)
        .innerJoin(students, eq(attendanceRecords.studentId, students.id))
        .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
        .innerJoin(terms, eq(attendanceRecords.termId, terms.id))
        .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
        .where(and(eq(attendanceRecords.schoolId, admin.schoolId), eq(attendanceRecords.termId, resolvedTermId)))
        .orderBy(asc(attendanceRecords.attendanceDate))
    : [];

  const exportRows: AttendanceExportRow[] = rows
    .filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (studentId && row.studentId !== studentId) return false;
      return true;
    })
    .map((row) => ({
      attendanceId: row.id,
      date: row.attendanceDate,
      session: row.sessionYear,
      term: row.termNumber,
      className: row.className,
      studentId: row.studentId,
      studentName: `${row.firstName} ${row.lastName}`.trim(),
      admissionNumber: row.admissionNumber,
      status: row.status,
      excuseReason: row.excuseReason || "",
    }));

  const format = String(payload.format || "json").trim().toLowerCase();
  if (format === "csv") {
    return new NextResponse(buildCsv(exportRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"attendance-export.csv\"",
      },
    });
  }

  return NextResponse.json({ count: exportRows.length, attendance: exportRows, termId: resolvedTermId || null });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleExport(req, {
      classId: searchParams.get("classId") || undefined,
      termId: searchParams.get("termId") || undefined,
      studentId: searchParams.get("studentId") || undefined,
      format: searchParams.get("format") || undefined,
    });
  } catch (error: unknown) {
    console.error("Attendance export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleExport(req, {
      classId: String(body?.classId || "").trim() || undefined,
      termId: String(body?.termId || "").trim() || undefined,
      studentId: String(body?.studentId || "").trim() || undefined,
      format: String(body?.format || "").trim() || undefined,
    });
  } catch (error: unknown) {
    console.error("Attendance export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export attendance" },
      { status: 500 }
    );
  }
}
