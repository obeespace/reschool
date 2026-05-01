import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { attendanceRecords, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const classId = String(searchParams.get("classId") || "").trim();

    const termRows = await d1
      .select({ id: terms.id, termNumber: terms.termNumber })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({
        stats: { totalMarked: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
        byDate: [],
        byClass: [],
      });
    }

    const rows = await d1
      .select({
        classId: attendanceRecords.classId,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
        attendanceDate: attendanceRecords.attendanceDate,
      })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.schoolId, user.schoolId), eq(attendanceRecords.termId, termRows[0].id)));

    const filteredRows = classId ? rows.filter((row) => row.classId === classId) : rows;

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    const byDateMap = new Map<string, { date: string; total: number; present: number; absent: number; late: number; excused: number }>();
    const byClassMap = new Map<string, { classId: string; total: number; present: number }>();

    for (const row of filteredRows) {
      const status = String(row.status || "").toUpperCase();
      if (status === "PRESENT") present += 1;
      else if (status === "ABSENT") absent += 1;
      else if (status === "LATE") late += 1;
      else if (status === "EXCUSED") excused += 1;

      const dateKey = new Date(Number(row.attendanceDate)).toISOString().slice(0, 10);
      const existingDate = byDateMap.get(dateKey) || {
        date: dateKey,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };

      existingDate.total += 1;
      if (status === "PRESENT") existingDate.present += 1;
      else if (status === "ABSENT") existingDate.absent += 1;
      else if (status === "LATE") existingDate.late += 1;
      else if (status === "EXCUSED") existingDate.excused += 1;
      byDateMap.set(dateKey, existingDate);

      const existingClass = byClassMap.get(row.classId) || { classId: row.classId, total: 0, present: 0 };
      existingClass.total += 1;
      if (status === "PRESENT") existingClass.present += 1;
      byClassMap.set(row.classId, existingClass);
    }

    const totalMarked = filteredRows.length;
    const attendanceRate = totalMarked ? Number(((present / totalMarked) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      term: termRows[0].termNumber,
      stats: {
        totalMarked,
        present,
        absent,
        late,
        excused,
        attendanceRate,
      },
      byDate: [...byDateMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byClass: [...byClassMap.values()].map((entry) => ({
        ...entry,
        attendanceRate: entry.total ? Number(((entry.present / entry.total) * 100).toFixed(2)) : 0,
      })),
    });
  } catch (error: unknown) {
    console.error("Attendance dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load attendance dashboard" },
      { status: 500 }
    );
  }
}