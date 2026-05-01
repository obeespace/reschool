import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, reportCards } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getParentWardData, getTeacherProfileData } from "@/app/utils/schoolRelationships";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

type PrintHistoryItem = {
  actorId: string;
  actorRole: string;
  timestamp: string;
  reason: string;
};

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "PARENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const reportId = String(body?.reportId || "").trim();
    const reason = String(body?.reason || "Generated report print").trim();

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    const rows = await d1
      .select({
        id: reportCards.id,
        studentId: reportCards.studentId,
        classId: reportCards.classId,
        approvedBy: reportCards.approvedBy,
        printCount: reportCards.printCount,
        printHistoryJson: reportCards.printHistoryJson,
      })
      .from(reportCards)
      .where(and(eq(reportCards.id, reportId), eq(reportCards.schoolId, user.schoolId)))
      .limit(1);

    const report = rows[0];
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && !report.approvedBy) {
      return NextResponse.json({ error: "Report is not released" }, { status: 403 });
    }

    if (user.role === "PARENT") {
      const wards = await getParentWardData(d1, user.schoolId, user.userId);
      const allowed = wards.some((ward) => ward.id === report.studentId);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (user.role === "TEACHER") {
      const profile = await getTeacherProfileData(d1, user.schoolId, user.userId);
      const classIds = new Set<string>();
      if (profile?.classTeacherOf?._id) classIds.add(profile.classTeacherOf._id);
      for (const entry of profile?.subjectsAndClasses || []) {
        for (const cls of entry.classIds) {
          if (cls?._id) classIds.add(cls._id);
        }
      }
      if (!classIds.has(report.classId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const now = new Date();
    let history: PrintHistoryItem[] = [];
    try {
      const parsed = JSON.parse(report.printHistoryJson || "[]");
      history = Array.isArray(parsed) ? parsed : [];
    } catch {
      history = [];
    }

    history.push({
      actorId: user.userId,
      actorRole: user.role,
      timestamp: now.toISOString(),
      reason,
    });

    const nextPrintCount = Number(report.printCount || 0) + 1;
    await d1
      .update(reportCards)
      .set({
        printCount: nextPrintCount,
        printHistoryJson: JSON.stringify(history),
        updatedAt: now,
      })
      .where(eq(reportCards.id, reportId));

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: user.schoolId,
      actorId: user.userId,
      action: "REPORT_PRINTED",
      metaJson: JSON.stringify({ reportId, printCount: nextPrintCount, reason }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`reports:list:${user.schoolId}:`);

    return NextResponse.json({ message: "Report print recorded", reportId, printCount: nextPrintCount });
  } catch (error: unknown) {
    console.error("Print report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record report print" },
      { status: 500 }
    );
  }
}
