import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { results, students, subjects, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const classId = String(searchParams.get("classId") || "").trim();
    const subjectId = String(searchParams.get("subjectId") || "").trim();
    const studentId = String(searchParams.get("studentId") || "").trim();
    const termIdParam = String(searchParams.get("termId") || "").trim();

    let termId = termIdParam;
    if (!termId) {
      const termRows = await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1);
      termId = termRows[0]?.id || "";
    }

    if (!termId) {
      return NextResponse.json({ scores: [] });
    }

    const rows = await d1
      .select({
        id: results.id,
        studentId: results.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        subjectId: results.subjectId,
        subjectName: subjects.name,
        classId: results.classId,
        score: results.score,
      })
      .from(results)
      .innerJoin(students, eq(results.studentId, students.id))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.schoolId, user.schoolId), eq(results.termId, termId)));

    const filtered = rows.filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (subjectId && row.subjectId !== subjectId) return false;
      if (studentId && row.studentId !== studentId) return false;
      return true;
    });

    return NextResponse.json({
      scores: filtered.map((row) => ({
        _id: row.id,
        id: row.id,
        studentId: {
          _id: row.studentId,
          fullName: `${row.firstName} ${row.lastName}`.trim(),
        },
        subjectId: {
          _id: row.subjectId,
          name: row.subjectName,
        },
        classId: row.classId,
        score: row.score,
      })),
    });
  } catch (error: unknown) {
    console.error("View scores error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scores" },
      { status: 500 }
    );
  }
}