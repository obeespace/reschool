import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";

function parseMeta(metaJson: string | null): Record<string, unknown> {
  if (!metaJson) return {};
  try {
    return JSON.parse(metaJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isVisibleToRole(
  targetAudience: string,
  role: ITokenPayload["role"]
): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER") {
    return targetAudience === "ALL" || targetAudience === "TEACHERS_ONLY";
  }
  return targetAudience === "ALL" || targetAudience === "PARENTS_ONLY";
}

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

    const [createdRows, readRows] = await Promise.all([
      d1
        .select({ metaJson: auditLogs.metaJson, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(and(eq(auditLogs.schoolId, user.schoolId), eq(auditLogs.action, "ANNOUNCEMENT_CREATED")))
        .orderBy(desc(auditLogs.createdAt)),
      d1
        .select({ metaJson: auditLogs.metaJson })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.schoolId, user.schoolId),
            eq(auditLogs.action, "ANNOUNCEMENT_READ"),
            eq(auditLogs.actorId, user.userId)
          )
        ),
    ]);

    const readIds = new Set<string>();
    for (const row of readRows) {
      const meta = parseMeta(row.metaJson);
      const announcementId = meta.announcementId ? String(meta.announcementId) : "";
      if (announcementId) readIds.add(announcementId);
    }

    const visibleAnnouncements: Array<{ id: string; title: string; createdAt: number }> = [];

    for (const row of createdRows) {
      const meta = parseMeta(row.metaJson);
      const announcementId = meta.announcementId ? String(meta.announcementId) : "";
      const title = meta.title ? String(meta.title) : "Announcement";
      const targetAudience = meta.targetAudience ? String(meta.targetAudience) : "ALL";

      if (!announcementId) continue;
      if (!isVisibleToRole(targetAudience, user.role)) continue;

      visibleAnnouncements.push({
        id: announcementId,
        title,
        createdAt: row.createdAt.getTime(),
      });
    }

    const unreadAnnouncements = visibleAnnouncements.filter((item) => !readIds.has(item.id));

    return NextResponse.json({
      unreadCount: unreadAnnouncements.length,
      recentAnnouncements: unreadAnnouncements.slice(0, 5),
      storageMode: "audit-log-transitional",
    });
  } catch (error: unknown) {
    console.error("Unread announcement count error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}