import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, classes, users } from "@/app/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  announcementType: "GENERAL" | "CLASS_SPECIFIC";
  targetAudience: "ALL" | "TEACHERS_ONLY" | "PARENTS_ONLY";
  classId?: string | null;
  createdAt: number;
};

function parseMeta(metaJson: string | null): Record<string, unknown> {
  if (!metaJson) return {};
  try {
    return JSON.parse(metaJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isVisibleToRole(
  record: AnnouncementRecord,
  role: ITokenPayload["role"]
): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER") {
    return record.targetAudience === "ALL" || record.targetAudience === "TEACHERS_ONLY";
  }
  return record.targetAudience === "ALL" || record.targetAudience === "PARENTS_ONLY";
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

    const rows = await d1
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        metaJson: auditLogs.metaJson,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.schoolId, user.schoolId), eq(auditLogs.action, "ANNOUNCEMENT_CREATED")))
      .orderBy(desc(auditLogs.createdAt));

    const announcementRows: Array<{
      logId: string;
      actorId: string | null;
      createdAt: number;
      record: AnnouncementRecord;
    }> = [];

    for (const row of rows) {
      const meta = parseMeta(row.metaJson);
      const title = String(meta.title || "").trim();
      const message = String(meta.message || "").trim();
      if (!title || !message) continue;

      const record: AnnouncementRecord = {
        id: String(meta.announcementId || row.id),
        title,
        message,
        announcementType:
          meta.announcementType === "CLASS_SPECIFIC" ? "CLASS_SPECIFIC" : "GENERAL",
        targetAudience:
          meta.targetAudience === "TEACHERS_ONLY" || meta.targetAudience === "PARENTS_ONLY"
            ? meta.targetAudience
            : "ALL",
        classId: meta.classId ? String(meta.classId) : null,
        createdAt: row.createdAt.getTime(),
      };

      if (!isVisibleToRole(record, user.role)) continue;

      announcementRows.push({
        logId: row.id,
        actorId: row.actorId,
        createdAt: row.createdAt.getTime(),
        record,
      });
    }

    const actorIds = [...new Set(announcementRows.map((row) => row.actorId).filter(Boolean) as string[])];
    const classIds = [...new Set(announcementRows.map((row) => row.record.classId).filter(Boolean) as string[])];

    const [authorRows, classRows] = await Promise.all([
      actorIds.length
        ? d1
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(inArray(users.id, actorIds))
        : Promise.resolve([]),
      classIds.length
        ? d1
            .select({ id: classes.id, name: classes.name })
            .from(classes)
            .where(inArray(classes.id, classIds))
        : Promise.resolve([]),
    ]);

    const authorMap = new Map(authorRows.map((row) => [row.id, row]));
    const classMap = new Map(classRows.map((row) => [row.id, row.name]));

    return NextResponse.json({
      announcements: announcementRows.map((row) => {
        const author = row.actorId ? authorMap.get(row.actorId) : null;
        const className = row.record.classId ? classMap.get(row.record.classId) || null : null;

        return {
          id: row.record.id,
          title: row.record.title,
          message: row.record.message,
          announcementType: row.record.announcementType,
          targetAudience: row.record.targetAudience,
          classId: row.record.classId || null,
          className,
          createdAt: row.createdAt,
          postedBy: {
            id: author?.id || row.actorId || "system",
            name: author?.name || "System",
            role: author?.role || "ADMIN",
          },
        };
      }),
      storageMode: "audit-log-transitional",
    });
  } catch (error: unknown) {
    console.error("Fetch announcements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}