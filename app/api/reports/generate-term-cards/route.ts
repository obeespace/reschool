import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { attendanceRecords, classes, dailyMarks, reportCards, sessions, subjects, terms } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

const LOW_ATTENDANCE_THRESHOLD = 75;

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const classId = String(body?.classId || "").trim();
    const studentIds = Array.isArray(body?.studentIds)
      ? body.studentIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    const termRows = await d1
      .select({
        id: terms.id,
        sessionId: terms.sessionId,
        termNumber: terms.termNumber,
        isClosed: terms.isClosed,
      })
      .from(terms)
      .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    const currentTerm = termRows[0];
    if (!currentTerm) {
      return NextResponse.json({ error: "No active term found" }, { status: 400 });
    }

    if (!currentTerm.isClosed) {
      return NextResponse.json({ error: "You can only generate report cards for a closed term" }, { status: 400 });
    }

    const sessionRows = await d1
      .select({ year: sessions.year })
      .from(sessions)
      .where(and(eq(sessions.id, currentTerm.sessionId), eq(sessions.schoolId, admin.schoolId)))
      .limit(1);

    const yearLabel = sessionRows[0]?.year || "Unknown Session";

    const marksRows = await d1
      .select({
        studentId: dailyMarks.studentId,
        classId: dailyMarks.classId,
        subjectId: dailyMarks.subjectId,
        subjectName: subjects.name,
        score: dailyMarks.score,
        assessmentType: dailyMarks.assessmentType,
      })
      .from(dailyMarks)
      .innerJoin(subjects, eq(dailyMarks.subjectId, subjects.id))
      .where(
        and(
          eq(dailyMarks.schoolId, admin.schoolId),
          eq(dailyMarks.termId, currentTerm.id),
          eq(dailyMarks.isDeleted, false)
        )
      );

    const filteredMarks = marksRows.filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (studentIds.length > 0 && !studentIds.includes(row.studentId)) return false;
      return true;
    });

    if (filteredMarks.length === 0) {
      return NextResponse.json({ message: "No marks found for selected scope", generated: 0 });
    }

    const classIds = [...new Set(filteredMarks.map((row) => row.classId))];
    const scopedStudentIds = [...new Set(filteredMarks.map((row) => row.studentId))];
    const classRows = classIds.length
      ? await d1
          .select({ id: classes.id, name: classes.name })
          .from(classes)
          .where(and(eq(classes.schoolId, admin.schoolId), inArray(classes.id, classIds)))
      : [];
    const classNameMap = new Map(classRows.map((row) => [row.id, row.name]));

    const attendanceRows = scopedStudentIds.length
      ? await d1
          .select({
            studentId: attendanceRecords.studentId,
            status: attendanceRecords.status,
          })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.schoolId, admin.schoolId),
              eq(attendanceRecords.termId, currentTerm.id),
              inArray(attendanceRecords.studentId, scopedStudentIds)
            )
          )
      : [];

    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    for (const row of attendanceRows) {
      const entry = attendanceByStudent.get(row.studentId) || { present: 0, total: 0 };
      entry.total += 1;
      if (String(row.status || "").toUpperCase() === "PRESENT") {
        entry.present += 1;
      }
      attendanceByStudent.set(row.studentId, entry);
    }

    type SubjectAgg = {
      subjectId: string;
      subjectName: string;
      classwork: number;
      homework: number;
      extracurricular: number;
      test: number;
      exam: number;
      total: number;
    };

    const byStudent = new Map<string, { classId: string; subjects: Map<string, SubjectAgg> }>();
    for (const row of filteredMarks) {
      if (!byStudent.has(row.studentId)) {
        byStudent.set(row.studentId, { classId: row.classId, subjects: new Map() });
      }

      const studentBucket = byStudent.get(row.studentId);
      if (!studentBucket) continue;

      if (!studentBucket.subjects.has(row.subjectId)) {
        studentBucket.subjects.set(row.subjectId, {
          subjectId: row.subjectId,
          subjectName: row.subjectName,
          classwork: 0,
          homework: 0,
          extracurricular: 0,
          test: 0,
          exam: 0,
          total: 0,
        });
      }

      const subjectBucket = studentBucket.subjects.get(row.subjectId);
      if (!subjectBucket) continue;

      const value = Number(row.score) || 0;
      const kind = String(row.assessmentType || "").toLowerCase();
      if (kind === "classwork") subjectBucket.classwork += value;
      else if (kind === "homework") subjectBucket.homework += value;
      else if (kind === "extracurricular") subjectBucket.extracurricular += value;
      else if (kind === "test") subjectBucket.test += value;
      else if (kind === "exam") subjectBucket.exam += value;
      else subjectBucket.classwork += value;

      subjectBucket.total =
        subjectBucket.classwork +
        subjectBucket.homework +
        subjectBucket.extracurricular +
        subjectBucket.test +
        subjectBucket.exam;
    }

    const classBuckets = new Map<string, Array<{ studentId: string; totalScore: number; averageScore: number }>>();
    const compiled = [...byStudent.entries()].map(([studentId, payload]) => {
      const subjectScores = [...payload.subjects.values()];
      const totalScore = subjectScores.reduce((sum, item) => sum + item.total, 0);
      const averageScore = subjectScores.length ? Number((totalScore / subjectScores.length).toFixed(2)) : 0;

      const currentClass = classBuckets.get(payload.classId) || [];
      currentClass.push({ studentId, totalScore, averageScore });
      classBuckets.set(payload.classId, currentClass);

      return {
        studentId,
        classId: payload.classId,
        subjectScores,
        totalScore,
        averageScore,
      };
    });

    const rankingMap = new Map<string, { rank: number; classSize: number }>();
    for (const [bucketClassId, entries] of classBuckets.entries()) {
      const sorted = [...entries].sort((a, b) => b.totalScore - a.totalScore);
      sorted.forEach((entry, index) => {
        rankingMap.set(`${bucketClassId}:${entry.studentId}`, {
          rank: index + 1,
          classSize: sorted.length,
        });
      });
    }

    const now = new Date();
    let inserted = 0;
    let updated = 0;

    await d1.transaction(async (tx) => {
      for (const row of compiled) {
        const ranking = rankingMap.get(`${row.classId}:${row.studentId}`) || { rank: null, classSize: null };
        const existing = await tx
          .select({ id: reportCards.id })
          .from(reportCards)
          .where(
            and(
              eq(reportCards.schoolId, admin.schoolId),
              eq(reportCards.studentId, row.studentId),
              eq(reportCards.termId, currentTerm.id)
            )
          )
          .limit(1);

        const payload = {
          schoolId: admin.schoolId,
          studentId: row.studentId,
          termId: currentTerm.id,
          sessionId: currentTerm.sessionId,
          classId: row.classId,
          sectionId: null,
          className: classNameMap.get(row.classId) || "Unknown Class",
          termNumber: currentTerm.termNumber,
          yearLabel,
          subjectScoresJson: JSON.stringify(row.subjectScores),
          totalScore: row.totalScore,
          averageScore: row.averageScore,
          classRanking: ranking.rank,
          classSize: ranking.classSize,
          overallRemark: null,
          attendancePercentage: attendanceByStudent.get(row.studentId)?.total
            ? Number(
                ((attendanceByStudent.get(row.studentId)?.present || 0) /
                  (attendanceByStudent.get(row.studentId)?.total || 1) * 100).toFixed(2)
              )
            : null,
          comportmentJson: "{}",
          promotionStatus: null,
          repeatReason: null,
          generatedDate: now,
          approvedBy: null,
          printCount: 0,
          printHistoryJson: "[]",
          updatedAt: now,
        };

        if (existing[0]) {
          await tx.update(reportCards).set(payload).where(eq(reportCards.id, existing[0].id));
          updated += 1;
        } else {
          await tx.insert(reportCards).values({ id: crypto.randomUUID(), createdAt: now, ...payload });
          inserted += 1;
        }
      }
    });

    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:class-ranking:${admin.schoolId}:`);

    return NextResponse.json({
      message: "Report cards generated",
      summary: {
        generated: inserted + updated,
        inserted,
        updated,
        lowAttendanceThreshold: LOW_ATTENDANCE_THRESHOLD,
      },
    });
  } catch (error: unknown) {
    console.error("Generate term cards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report cards" },
      { status: 500 }
    );
  }
}