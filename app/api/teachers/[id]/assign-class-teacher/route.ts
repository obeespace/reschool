import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, teacherClassAssignments, users } from "@/app/db/schema";
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
    const classId = String(body?.classId || "").trim();

    if (!teacherId || !classId) {
      return NextResponse.json({ error: "Teacher ID and class ID are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [teacherRows, classRows] = await Promise.all([
      d1.select({ id: users.id }).from(users).where(and(eq(users.id, teacherId), eq(users.schoolId, admin.schoolId), eq(users.role, "TEACHER"))).limit(1),
      d1.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, admin.schoolId))).limit(1),
    ]);

    if (!teacherRows[0] || !classRows[0]) {
      return NextResponse.json({ error: "Teacher or class not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.transaction(async (tx) => {
      await tx.delete(teacherClassAssignments).where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.teacherId, teacherId)));
      await tx.delete(teacherClassAssignments).where(and(eq(teacherClassAssignments.schoolId, admin.schoolId), eq(teacherClassAssignments.classId, classId)));
      await tx.insert(teacherClassAssignments).values({
        id: crypto.randomUUID(),
        schoolId: admin.schoolId,
        teacherId,
        classId,
        createdAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({ message: "Class teacher assigned successfully" });
  } catch (error: unknown) {
    console.error("Assign class teacher error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign class teacher" },
      { status: 500 }
    );
  }
}