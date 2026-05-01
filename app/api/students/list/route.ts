import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { enrollments, sections, students, terms } from "@/app/db/schema";
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

    const rows = await d1
      .select()
      .from(students)
      .where(eq(students.schoolId, user.schoolId));

    const currentTermRows = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    const enrollmentMap = new Map<string, string>();
    const currentTermId = currentTermRows[0]?.id;
    if (currentTermId) {
      const enrollmentRows = await d1
        .select({ studentId: enrollments.studentId, sectionName: sections.name })
        .from(enrollments)
        .leftJoin(sections, eq(enrollments.sectionId, sections.id))
        .where(and(eq(enrollments.schoolId, user.schoolId), eq(enrollments.termId, currentTermId)));

      for (const row of enrollmentRows) {
        if (row.sectionName) {
          enrollmentMap.set(row.studentId, row.sectionName);
        }
      }
    }

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: row.id,
        id: row.id,
        fullName: `${row.firstName} ${row.lastName}`.trim(),
        admissionNumber: row.admissionNumber,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        currentClass: enrollmentMap.get(row.id) || null,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}