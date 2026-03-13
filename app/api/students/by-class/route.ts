import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { enrollments, students } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classId = new URL(req.url).searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const rows = await d1
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        gender: students.gender,
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(
        and(
          eq(enrollments.schoolId, user.schoolId),
          eq(enrollments.classId, classId)
        )
      );

    return NextResponse.json({
      students: rows.map((row) => ({
        _id: row.id,
        id: row.id,
        fullName: `${row.firstName} ${row.lastName}`.trim(),
        admissionNumber: row.admissionNumber,
        gender: row.gender,
      })),
    });
  } catch (error: unknown) {
    console.error("Fetch students by class error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}