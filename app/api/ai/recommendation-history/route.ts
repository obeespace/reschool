import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, parentWardLinks, students } from "@/app/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

type RecommendationHistoryEntry = {
  id: string;
  studentId: string;
  studentName: string;
  level: "JSS3" | "SSS3";
  topChoice: string | null;
  recommendations: unknown[];
  summary: Record<string, unknown>;
  requestedAt: string;
  requestedBy: string | null;
};

const ACTION_BY_LEVEL: Record<string, string> = {
  JSS3: "AI_JSS3_RECOMMENDATION_GENERATED",
  SSS3: "AI_SSS3_RECOMMENDATION_GENERATED",
};

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const level = String(searchParams.get("level") || "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 20)));

    let allowedStudentIds: string[] = [];
    if (user.role === "PARENT") {
      const wardRows = await d1
        .select({ studentId: parentWardLinks.studentId })
        .from(parentWardLinks)
        .where(and(eq(parentWardLinks.schoolId, user.schoolId), eq(parentWardLinks.parentId, user.userId)));

      allowedStudentIds = wardRows.map((row) => row.studentId);
      if (studentId && !allowedStudentIds.includes(studentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!allowedStudentIds.length) {
        return NextResponse.json({ history: [], count: 0 });
      }
    }

    const actionFilter = level && ACTION_BY_LEVEL[level]
      ? [ACTION_BY_LEVEL[level]]
      : [ACTION_BY_LEVEL.JSS3, ACTION_BY_LEVEL.SSS3];

    const rawRows = await d1
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        metaJson: auditLogs.metaJson,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.schoolId, user.schoolId), inArray(auditLogs.action, actionFilter)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.max(limit * 5, 100));

    const parsedRows = rawRows
      .map((row) => {
        let meta: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(row.metaJson || "{}");
          meta = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
        } catch {
          meta = {};
        }

        const metaStudentId = String(meta.studentId || "").trim();
        if (!metaStudentId) return null;
        if (studentId && metaStudentId !== studentId) return null;
        if (user.role === "PARENT" && !allowedStudentIds.includes(metaStudentId)) return null;

        const historyLevel = row.action === ACTION_BY_LEVEL.SSS3 ? "SSS3" : "JSS3";

        return {
          id: row.id,
          studentId: metaStudentId,
          studentName: String(meta.studentName || "").trim(),
          level: historyLevel,
          topChoice: typeof meta.topChoice === "string" ? meta.topChoice : null,
          recommendations: Array.isArray(meta.recommendations) ? meta.recommendations : [],
          summary: meta.summary && typeof meta.summary === "object"
            ? (meta.summary as Record<string, unknown>)
            : {},
          requestedAt: new Date(row.createdAt).toISOString(),
          requestedBy: row.actorId,
        } as RecommendationHistoryEntry;
      })
      .filter((entry): entry is RecommendationHistoryEntry => Boolean(entry))
      .slice(0, limit);

    const unresolvedIds = [...new Set(parsedRows.map((entry) => entry.studentId))].filter(Boolean);
    const studentRows = unresolvedIds.length
      ? await d1
          .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
          .from(students)
          .where(and(eq(students.schoolId, user.schoolId), inArray(students.id, unresolvedIds)))
      : [];

    const studentNameMap = new Map(
      studentRows.map((row) => [row.id, `${row.firstName || ""} ${row.lastName || ""}`.trim()])
    );

    const history = parsedRows.map((entry) => ({
      ...entry,
      studentName: entry.studentName || studentNameMap.get(entry.studentId) || "Unknown Student",
    }));

    return NextResponse.json({ history, count: history.length });
  } catch (error: unknown) {
    console.error("Recommendation history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load recommendation history" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
