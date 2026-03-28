import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { dailyMarks, subjects, terms } from "@/app/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getParentWardData } from "@/app/utils/schoolRelationships";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");

    if (!parent || parent.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const wards = await getParentWardData(d1, parent.schoolId, parent.userId);
    const wardIds = wards.map((ward) => ward.id).filter(Boolean);
    if (!wardIds.length) {
      return NextResponse.json({ dailyMarks: [] });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const filterStudentIds = studentId && wardIds.includes(studentId) ? [studentId] : wardIds;

    const rows = await d1
      .select({
        id: dailyMarks.id,
        studentId: dailyMarks.studentId,
        subjectId: dailyMarks.subjectId,
        subjectName: subjects.name,
        score: dailyMarks.score,
        maxScore: dailyMarks.maxScore,
        assessmentType: dailyMarks.assessmentType,
        feedbackNotes: dailyMarks.feedbackNotes,
        recordedDate: dailyMarks.recordedDate,
        termNumber: terms.termNumber,
      })
      .from(dailyMarks)
      .innerJoin(subjects, eq(dailyMarks.subjectId, subjects.id))
      .innerJoin(terms, eq(dailyMarks.termId, terms.id))
      .where(
        and(
          eq(dailyMarks.schoolId, parent.schoolId),
          eq(dailyMarks.isDeleted, false),
          inArray(dailyMarks.studentId, filterStudentIds)
        )
      )
      .orderBy(desc(dailyMarks.recordedDate));

    return NextResponse.json({
      dailyMarks: rows.map((row) => ({
        _id: row.id,
        studentId: row.studentId,
        subjectId: { _id: row.subjectId, name: row.subjectName },
        score: row.score,
        maxScore: row.maxScore,
        type: row.assessmentType,
        feedbackNotes: row.feedbackNotes,
        recordedDate: row.recordedDate,
        term: row.termNumber,
      })),
    });
  } catch (error: unknown) {
    console.error("Parent daily marks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch daily marks" },
      { status: 500 }
    );
  }
}