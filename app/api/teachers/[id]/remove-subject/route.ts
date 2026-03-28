import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { teacherSubjectAssignments } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const teacherId = String(id || "").trim();
    const body = await req.json();
    const subjectId = String(body?.subjectId || "").trim();

    if (!teacherId || !subjectId) {
      return NextResponse.json({ error: "Teacher ID and subject ID are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    await d1
      .delete(teacherSubjectAssignments)
      .where(
        and(
          eq(teacherSubjectAssignments.schoolId, admin.schoolId),
          eq(teacherSubjectAssignments.teacherId, teacherId),
          eq(teacherSubjectAssignments.subjectId, subjectId)
        )
      );

    return NextResponse.json({ message: "Subject removed successfully" });
  } catch (error: unknown) {
    console.error("Remove subject error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove subject" },
      { status: 500 }
    );
  }
}