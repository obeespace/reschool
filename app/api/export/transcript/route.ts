import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { parentWardLinks, reportCards, sessions, students, terms } from "@/app/db/schema";
import { and, asc, eq } from "drizzle-orm";

type TranscriptLine = {
  session: string;
  term: number;
  className: string;
  subject: string;
  score: number;
  averageScore: number;
  totalScore: number;
  classRanking: number | null;
  classSize: number | null;
};

function parseSubjectLabel(value: unknown): string {
  if (typeof value === "object" && value && "subjectName" in value) {
    return String((value as { subjectName?: unknown }).subjectName || "Unknown Subject");
  }
  return "Unknown Subject";
}

function parseSubjectScore(value: unknown): number {
  if (typeof value === "object" && value) {
    const candidate = value as {
      total?: unknown;
      score?: unknown;
      exam?: unknown;
      test?: unknown;
      classwork?: unknown;
      homework?: unknown;
      extracurricular?: unknown;
    };

    if (candidate.total != null) return Number(candidate.total) || 0;
    if (candidate.score != null) return Number(candidate.score) || 0;

    return (
      (Number(candidate.exam) || 0) +
      (Number(candidate.test) || 0) +
      (Number(candidate.classwork) || 0) +
      (Number(candidate.homework) || 0) +
      (Number(candidate.extracurricular) || 0)
    );
  }

  return 0;
}

function buildCsv(lines: TranscriptLine[]): string {
  const header = [
    "Session",
    "Term",
    "Class",
    "Subject",
    "Score",
    "Average",
    "Total",
    "Class Rank",
    "Class Size",
  ];

  const rows = lines.map((line) =>
    [
      line.session,
      String(line.term),
      line.className,
      line.subject,
      String(line.score),
      String(line.averageScore),
      String(line.totalScore),
      line.classRanking == null ? "" : String(line.classRanking),
      line.classSize == null ? "" : String(line.classSize),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

async function handleExport(req: Request, payload: { studentId?: string; format?: string }) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  const user: ITokenPayload | null = verifyToken(token || "");

  if (!user || (user.role !== "ADMIN" && user.role !== "PARENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const studentId = String(payload.studentId || "").trim();
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const d1 = getOptionalD1Client();
  if (!d1) {
    return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
  }

  if (user.role === "PARENT") {
    const links = await d1
      .select({ id: parentWardLinks.id })
      .from(parentWardLinks)
      .where(
        and(
          eq(parentWardLinks.schoolId, user.schoolId),
          eq(parentWardLinks.parentId, user.userId),
          eq(parentWardLinks.studentId, studentId)
        )
      )
      .limit(1);

    if (!links[0]) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const studentRows = await d1
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
    })
    .from(students)
    .where(and(eq(students.schoolId, user.schoolId), eq(students.id, studentId)))
    .limit(1);

  if (!studentRows[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const cards = await d1
    .select({
      sessionId: reportCards.sessionId,
      termNumber: reportCards.termNumber,
      className: reportCards.className,
      subjectScoresJson: reportCards.subjectScoresJson,
      totalScore: reportCards.totalScore,
      averageScore: reportCards.averageScore,
      classRanking: reportCards.classRanking,
      classSize: reportCards.classSize,
    })
    .from(reportCards)
    .where(and(eq(reportCards.schoolId, user.schoolId), eq(reportCards.studentId, studentId)))
    .orderBy(asc(reportCards.generatedDate));

  const sessionRows = await d1
    .select({ id: sessions.id, year: sessions.year })
    .from(sessions)
    .where(eq(sessions.schoolId, user.schoolId));

  const sessionLabelMap = new Map(sessionRows.map((row) => [row.id, row.year]));

  const lines: TranscriptLine[] = [];
  for (const card of cards) {
    const parsed = JSON.parse(card.subjectScoresJson || "[]") as unknown[];
    const subjects = Array.isArray(parsed) ? parsed : [];

    if (subjects.length === 0) {
      lines.push({
        session: sessionLabelMap.get(card.sessionId) || "Unknown Session",
        term: card.termNumber,
        className: card.className,
        subject: "N/A",
        score: 0,
        averageScore: Number(card.averageScore) || 0,
        totalScore: Number(card.totalScore) || 0,
        classRanking: card.classRanking,
        classSize: card.classSize,
      });
      continue;
    }

    for (const subject of subjects) {
      lines.push({
        session: sessionLabelMap.get(card.sessionId) || "Unknown Session",
        term: card.termNumber,
        className: card.className,
        subject: parseSubjectLabel(subject),
        score: parseSubjectScore(subject),
        averageScore: Number(card.averageScore) || 0,
        totalScore: Number(card.totalScore) || 0,
        classRanking: card.classRanking,
        classSize: card.classSize,
      });
    }
  }

  if (lines.length === 0) {
    const fallbackTerms = await d1
      .select({ id: terms.id, termNumber: terms.termNumber, sessionId: terms.sessionId })
      .from(terms)
      .where(eq(terms.schoolId, user.schoolId));
    const first = fallbackTerms[0];
    if (first) {
      lines.push({
        session: sessionLabelMap.get(first.sessionId) || "Unknown Session",
        term: first.termNumber,
        className: "N/A",
        subject: "N/A",
        score: 0,
        averageScore: 0,
        totalScore: 0,
        classRanking: null,
        classSize: null,
      });
    }
  }

  const format = String(payload.format || "json").trim().toLowerCase();
  const student = {
    id: studentRows[0].id,
    fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
    admissionNumber: studentRows[0].admissionNumber,
  };

  if (format === "csv") {
    return new NextResponse(buildCsv(lines), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transcript-${student.admissionNumber}.csv"`,
      },
    });
  }

  return NextResponse.json({
    student,
    lineCount: lines.length,
    lines,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleExport(req, {
      studentId: searchParams.get("studentId") || undefined,
      format: searchParams.get("format") || undefined,
    });
  } catch (error: unknown) {
    console.error("Transcript export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export transcript" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleExport(req, {
      studentId: String(body?.studentId || "").trim() || undefined,
      format: String(body?.format || "").trim() || undefined,
    });
  } catch (error: unknown) {
    console.error("Transcript export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export transcript" },
      { status: 500 }
    );
  }
}