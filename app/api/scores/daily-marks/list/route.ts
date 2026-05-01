import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { dailyMarks, students, teacherSubjectAssignments, terms } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";

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
    const type = String(searchParams.get("type") || "").trim();
    const academicYearId = String(searchParams.get("academicYearId") || "").trim();

    let termId = "";
    if (academicYearId) {
      const termRows = await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.sessionId, academicYearId), eq(terms.isCurrent, true)))
        .limit(1);
      termId = termRows[0]?.id || "";
    }

    if (!termId) {
      const currentTermRows = await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
        .limit(1);
      termId = currentTermRows[0]?.id || "";
    }

    if (!termId) {
      return NextResponse.json({ dailyMarks: [] });
    }

    if (user.role === "TEACHER" && classId && subjectId) {
      const allowedRows = await d1
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

      if (!allowedRows[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const query = d1
      .select({
        id: dailyMarks.id,
        studentId: dailyMarks.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        classId: dailyMarks.classId,
        subjectId: dailyMarks.subjectId,
        assessmentType: dailyMarks.assessmentType,
        score: dailyMarks.score,
        maxScore: dailyMarks.maxScore,
        weightage: dailyMarks.weightage,
        feedbackNotes: dailyMarks.feedbackNotes,
        recordedDate: dailyMarks.recordedDate,
      })
      .from(dailyMarks)
      .innerJoin(students, eq(dailyMarks.studentId, students.id))
      .where(and(eq(dailyMarks.schoolId, user.schoolId), eq(dailyMarks.termId, termId), eq(dailyMarks.isDeleted, false)))
      .orderBy(desc(dailyMarks.recordedDate));

    const rows = await query;
    const filteredRows = rows.filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (subjectId && row.subjectId !== subjectId) return false;
      if (type && row.assessmentType !== type) return false;
      return true;
    });

    return NextResponse.json({
      dailyMarks: filteredRows.map((row) => ({
        _id: row.id,
        id: row.id,
        studentId: {
          _id: row.studentId,
          id: row.studentId,
          fullName: `${row.firstName} ${row.lastName}`.trim(),
        },
        classId: row.classId,
        subjectId: row.subjectId,
        type: row.assessmentType,
        score: row.score,
        maxScore: row.maxScore,
        weightage: row.weightage,
        feedbackNotes: row.feedbackNotes,
        recordedDate: row.recordedDate,
      })),
    });
  } catch (error: unknown) {
    console.error("List daily marks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list daily marks" },
      { status: 500 }
    );
  }
}