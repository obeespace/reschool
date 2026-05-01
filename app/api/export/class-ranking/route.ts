import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { reportCards, students, terms } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";

type RankingExportRow = {
  reportId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  session: string;
  term: number;
  averageScore: number;
  totalScore: number;
  attendancePercentage: number | null;
  classRanking: number | null;
  classSize: number | null;
};

function buildCsv(rows: RankingExportRow[]): string {
  const header = [
    "Report ID",
    "Student ID",
    "Student Name",
    "Admission Number",
    "Class ID",
    "Class Name",
    "Session",
    "Term",
    "Average Score",
    "Total Score",
    "Attendance Percentage",
    "Class Rank",
    "Class Size",
  ];

  const data = rows.map((row) =>
    [
      row.reportId,
      row.studentId,
      row.studentName,
      row.admissionNumber,
      row.classId,
      row.className,
      row.session,
      String(row.term),
      String(row.averageScore),
      String(row.totalScore),
      row.attendancePercentage == null ? "" : String(row.attendancePercentage),
      row.classRanking == null ? "" : String(row.classRanking),
      row.classSize == null ? "" : String(row.classSize),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header.join(","), ...data].join("\n");
}

async function handleExport(req: Request, payload: { classId?: string; termId?: string; format?: string }) {
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
          id: reportCards.id,
          studentId: reportCards.studentId,
          classId: reportCards.classId,
          className: reportCards.className,
          yearLabel: reportCards.yearLabel,
          termNumber: reportCards.termNumber,
          averageScore: reportCards.averageScore,
          totalScore: reportCards.totalScore,
          attendancePercentage: reportCards.attendancePercentage,
          classRanking: reportCards.classRanking,
          classSize: reportCards.classSize,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
        })
        .from(reportCards)
        .innerJoin(students, eq(reportCards.studentId, students.id))
        .where(and(eq(reportCards.schoolId, admin.schoolId), eq(reportCards.termId, resolvedTermId)))
        .orderBy(desc(reportCards.totalScore))
    : [];

  const exportRows: RankingExportRow[] = rows
    .filter((row) => !classId || row.classId === classId)
    .map((row) => ({
      reportId: row.id,
      studentId: row.studentId,
      studentName: `${row.firstName} ${row.lastName}`.trim(),
      admissionNumber: row.admissionNumber,
      classId: row.classId,
      className: row.className,
      session: row.yearLabel,
      term: row.termNumber,
      averageScore: Number(row.averageScore) || 0,
      totalScore: Number(row.totalScore) || 0,
      attendancePercentage: row.attendancePercentage == null ? null : Number(row.attendancePercentage),
      classRanking: row.classRanking,
      classSize: row.classSize,
    }));

  const format = String(payload.format || "json").trim().toLowerCase();
  if (format === "csv") {
    return new NextResponse(buildCsv(exportRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"class-ranking-export.csv\"",
      },
    });
  }

  return NextResponse.json({ count: exportRows.length, rankings: exportRows, termId: resolvedTermId || null });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleExport(req, {
      classId: searchParams.get("classId") || undefined,
      termId: searchParams.get("termId") || undefined,
      format: searchParams.get("format") || undefined,
    });
  } catch (error: unknown) {
    console.error("Class ranking export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export class ranking" },
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
      format: String(body?.format || "").trim() || undefined,
    });
  } catch (error: unknown) {
    console.error("Class ranking export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export class ranking" },
      { status: 500 }
    );
  }
}
