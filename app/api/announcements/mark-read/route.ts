import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

function parseMeta(metaJson: string | null): Record<string, unknown> {
  if (!metaJson) return {};
  try {
    return JSON.parse(metaJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const announcementId = String(body?.announcementId || "").trim();
    if (!announcementId) {
      return NextResponse.json({ error: "announcementId is required" }, { status: 400 });
    }

    const existingReads = await d1
      .select({ metaJson: auditLogs.metaJson })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.schoolId, user.schoolId),
          eq(auditLogs.action, "ANNOUNCEMENT_READ"),
          eq(auditLogs.actorId, user.userId)
        )
      );

    const alreadyRead = existingReads.some((row) => {
      const meta = parseMeta(row.metaJson);
      return String(meta.announcementId || "") === announcementId;
    });

    if (!alreadyRead) {
      const now = new Date();
      await d1.insert(auditLogs).values({
        id: crypto.randomUUID(),
        schoolId: user.schoolId,
        actorId: user.userId,
        action: "ANNOUNCEMENT_READ",
        metaJson: JSON.stringify({ announcementId }),
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      message: "Announcement marked as read",
      announcementId,
      storageMode: "audit-log-transitional",
    });
  } catch (error: unknown) {
    console.error("Mark announcement read error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark announcement as read" },
      { status: 500 }
    );
  }
}