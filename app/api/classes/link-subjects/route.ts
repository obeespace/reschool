import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { classes, classSubjects, subjects } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const subjectIds = Array.isArray(body?.subjectIds)
      ? body.subjectIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!classId || subjectIds.length === 0) {
      return NextResponse.json({ error: "classId and at least one subjectId are required" }, { status: 400 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [classRows, subjectRows] = await Promise.all([
      d1.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, admin.schoolId))).limit(1),
      d1.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.schoolId, admin.schoolId), inArray(subjects.id, subjectIds))),
    ]);

    if (!classRows[0] || subjectRows.length !== subjectIds.length) {
      return NextResponse.json({ error: "Class or one or more subjects not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.transaction(async (tx) => {
      await tx
        .delete(classSubjects)
        .where(and(eq(classSubjects.schoolId, admin.schoolId), eq(classSubjects.classId, classId)));

      for (const subjectId of subjectIds) {
        await tx.insert(classSubjects).values({
          id: crypto.randomUUID(),
          schoolId: admin.schoolId,
          classId,
          subjectId,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    return NextResponse.json({ message: "Class subjects updated successfully" });
  } catch (error: unknown) {
    console.error("Link class subjects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link class subjects" },
      { status: 500 }
    );
  }
}