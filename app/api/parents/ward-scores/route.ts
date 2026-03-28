import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { getParentWardData } from "@/app/utils/schoolRelationships";
import { dailyMarks, subjects, terms } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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
      return NextResponse.json({ wards, students: wards, scores: [] });
    }

    const markRows = await d1
      .select({
        id: dailyMarks.id,
        studentId: dailyMarks.studentId,
        subjectId: dailyMarks.subjectId,
        assessmentType: dailyMarks.assessmentType,
        score: dailyMarks.score,
        termId: dailyMarks.termId,
        subjectName: subjects.name,
        termNumber: terms.termNumber,
      })
      .from(dailyMarks)
      .innerJoin(subjects, eq(dailyMarks.subjectId, subjects.id))
      .innerJoin(terms, eq(dailyMarks.termId, terms.id))
      .where(
        and(
          eq(dailyMarks.schoolId, parent.schoolId),
          eq(dailyMarks.isDeleted, false),
          inArray(dailyMarks.studentId, wardIds)
        )
      );

    type ScoreAgg = {
      _id: string;
      studentId: { _id: string };
      subjectId: { _id: string; name: string };
      term: number;
      classwork: number;
      homework: number;
      extracurricular: number;
      test: number;
      exam: number;
      total: number;
    };

    const grouped = new Map<string, ScoreAgg>();
    for (const row of markRows) {
      const key = `${row.studentId}:${row.subjectId}:${row.termNumber}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          _id: key,
          studentId: { _id: row.studentId },
          subjectId: { _id: row.subjectId, name: row.subjectName },
          term: row.termNumber,
          classwork: 0,
          homework: 0,
          extracurricular: 0,
          test: 0,
          exam: 0,
          total: 0,
        });
      }

      const entry = grouped.get(key);
      if (!entry) continue;

      const bucket = String(row.assessmentType || "").toLowerCase();
      const value = Number(row.score) || 0;
      if (bucket === "classwork") entry.classwork += value;
      else if (bucket === "homework") entry.homework += value;
      else if (bucket === "extracurricular") entry.extracurricular += value;
      else if (bucket === "test") entry.test += value;
      else if (bucket === "exam") entry.exam += value;
      else entry.classwork += value;
    }

    const scores = [...grouped.values()].map((entry) => ({
      ...entry,
      total: entry.classwork + entry.homework + entry.extracurricular + entry.test + entry.exam,
    }));

    return NextResponse.json({
      wards,
      students: wards,
      scores,
    });
  } catch (error: unknown) {
    console.error("Parent ward scores error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ward scores" },
      { status: 500 }
    );
  }
}