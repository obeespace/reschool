import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { teacherClassAssignments } from "@/app/db/schema";
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
    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    await d1
      .delete(teacherClassAssignments)
      .where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.teacherId, teacherId)));

    return NextResponse.json({ message: "Class teacher removed successfully" });
  } catch (error: unknown) {
    console.error("Remove class teacher error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove class teacher" },
      { status: 500 }
    );
  }
}