import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { auditLogs, reportCards, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateServerCacheByPrefix } from "@/app/utils/serverCache";

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

    const body = await req.json().catch(() => ({}));
    const reportIds = Array.isArray(body?.reportIds)
      ? body.reportIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];
    const classId = String(body?.classId || "").trim();
    const termIdQuery = String(body?.termId || "").trim();

    const termId = termIdQuery || (
      await d1
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
        .limit(1)
    )[0]?.id;

    if (!termId) {
      return NextResponse.json({ error: "No target term found" }, { status: 400 });
    }

    const now = new Date();
    let released = 0;

    if (reportIds.length > 0) {
      for (const reportId of reportIds) {
        const updated = await d1
          .update(reportCards)
          .set({ approvedBy: admin.userId, updatedAt: now })
          .where(and(eq(reportCards.id, reportId), eq(reportCards.schoolId, admin.schoolId), eq(reportCards.termId, termId)))
          .returning({ id: reportCards.id });
        if (updated[0]) released += 1;
      }
    } else {
      const rows = await d1
        .select({ id: reportCards.id })
        .from(reportCards)
        .where(
          classId
            ? and(eq(reportCards.schoolId, admin.schoolId), eq(reportCards.termId, termId), eq(reportCards.classId, classId))
            : and(eq(reportCards.schoolId, admin.schoolId), eq(reportCards.termId, termId))
        );

      for (const row of rows) {
        await d1
          .update(reportCards)
          .set({ approvedBy: admin.userId, updatedAt: now })
          .where(eq(reportCards.id, row.id));
      }
      released = rows.length;
    }

    await d1.insert(auditLogs).values({
      id: crypto.randomUUID(),
      schoolId: admin.schoolId,
      actorId: admin.userId,
      action: "REPORTS_RELEASED",
      metaJson: JSON.stringify({ termId, classId: classId || null, reportIdsCount: reportIds.length, released }),
      createdAt: now,
      updatedAt: now,
    });

    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);

    return NextResponse.json({ message: "Reports released", released, termId });
  } catch (error: unknown) {
    console.error("Release reports error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to release reports" },
      { status: 500 }
    );
  }
}
