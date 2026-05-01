import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { parentWardLinks, reportCards, results, sessions, students, subjects, terms } from "@/app/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const studentId = String(id || "").trim();
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
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
        id: reportCards.id,
        termId: reportCards.termId,
        sessionId: reportCards.sessionId,
        termNumber: reportCards.termNumber,
        yearLabel: reportCards.yearLabel,
        className: reportCards.className,
        subjectScoresJson: reportCards.subjectScoresJson,
        totalScore: reportCards.totalScore,
        averageScore: reportCards.averageScore,
        classRanking: reportCards.classRanking,
        classSize: reportCards.classSize,
        generatedDate: reportCards.generatedDate,
      })
      .from(reportCards)
      .where(and(eq(reportCards.schoolId, user.schoolId), eq(reportCards.studentId, studentId)))
      .orderBy(asc(reportCards.generatedDate));

    if (cards.length > 0) {
      return NextResponse.json({
        student: {
          id: studentRows[0].id,
          fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
          admissionNumber: studentRows[0].admissionNumber,
        },
        transcript: cards.map((card) => ({
          _id: card.id,
          sessionId: card.sessionId,
          termId: card.termId,
          termNumber: card.termNumber,
          yearLabel: card.yearLabel,
          className: card.className,
          subjects: JSON.parse(card.subjectScoresJson || "[]"),
          totalScore: card.totalScore,
          averageScore: card.averageScore,
          classRanking: card.classRanking,
          classSize: card.classSize,
          generatedDate: card.generatedDate,
        })),
      });
    }

    const rawResults = await d1
      .select({
        id: results.id,
        score: results.score,
        sessionId: results.sessionId,
        termId: results.termId,
        subjectId: results.subjectId,
        subjectName: subjects.name,
        termNumber: terms.termNumber,
        sessionYear: sessions.year,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .innerJoin(terms, eq(results.termId, terms.id))
      .innerJoin(sessions, eq(results.sessionId, sessions.id))
      .where(and(eq(results.schoolId, user.schoolId), eq(results.studentId, studentId)));

    const grouped = new Map<string, { sessionId: string; termId: string; sessionYear: string; termNumber: number; subjects: Array<{ subjectId: string; name: string; score: number }> }>();
    for (const row of rawResults) {
      const key = `${row.sessionId}:${row.termId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          sessionId: row.sessionId,
          termId: row.termId,
          sessionYear: row.sessionYear,
          termNumber: row.termNumber,
          subjects: [],
        });
      }
      const bucket = grouped.get(key);
      if (!bucket) continue;
      bucket.subjects.push({ subjectId: row.subjectId, name: row.subjectName, score: row.score });
    }

    const transcript = [...grouped.values()].map((entry) => {
      const totalScore = entry.subjects.reduce((sum, subject) => sum + (Number(subject.score) || 0), 0);
      const averageScore = entry.subjects.length ? Number((totalScore / entry.subjects.length).toFixed(2)) : 0;
      return {
        sessionId: entry.sessionId,
        termId: entry.termId,
        termNumber: entry.termNumber,
        yearLabel: entry.sessionYear,
        subjects: entry.subjects,
        totalScore,
        averageScore,
      };
    });

    return NextResponse.json({
      student: {
        id: studentRows[0].id,
        fullName: `${studentRows[0].firstName} ${studentRows[0].lastName}`.trim(),
        admissionNumber: studentRows[0].admissionNumber,
      },
      transcript,
    });
  } catch (error: unknown) {
    console.error("Transcript error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}