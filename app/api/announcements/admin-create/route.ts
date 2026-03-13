import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs } from "@/app/db/schema";

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

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const targetAudience =
      body?.targetAudience === "TEACHERS_ONLY" || body?.targetAudience === "PARENTS_ONLY"
        ? body.targetAudience
        : "ALL";

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const now = new Date();
    const announcementId = crypto.randomUUID();

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: admin.schoolId,
      actorId: admin.userId,
      action: "ANNOUNCEMENT_CREATED",
      metaJson: JSON.stringify({
        announcementId,
        title,
        message,
        announcementType: "GENERAL",
        targetAudience,
      }),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "Announcement created successfully",
      announcementId,
      storageMode: "audit-log-transitional",
    });
  } catch (error: unknown) {
    console.error("Create admin announcement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create announcement" },
      { status: 500 }
    );
  }
}