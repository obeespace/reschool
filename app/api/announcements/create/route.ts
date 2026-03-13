import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, classes } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();

    if (!classId || !title || !message) {
      return NextResponse.json(
        { error: "classId, title, and message are required" },
        { status: 400 }
      );
    }

    const classExists = await d1
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, teacher.schoolId)))
      .limit(1);

    if (!classExists[0]) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const now = new Date();
    const announcementId = crypto.randomUUID();

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: teacher.schoolId,
      actorId: teacher.userId,
      action: "ANNOUNCEMENT_CREATED",
      metaJson: JSON.stringify({
        announcementId,
        classId,
        title,
        message,
        announcementType: "CLASS_SPECIFIC",
        targetAudience: "PARENTS_ONLY",
      }),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "Class announcement created successfully",
      announcementId,
      storageMode: "audit-log-transitional",
    });
  } catch (error: unknown) {
    console.error("Create class announcement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create announcement" },
      { status: 500 }
    );
  }
}