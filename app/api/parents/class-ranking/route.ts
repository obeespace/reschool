import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { dailyMarks, terms } from "@/app/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getParentWardData } from "@/app/utils/schoolRelationships";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");

    if (!parent || parent.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const termNumberFilter = Number(searchParams.get("term") || 0);

    const payload = await getOrSetServerCache({
      key: `parents:class-ranking:${parent.schoolId}:${parent.userId}:${termNumberFilter || "all"}`,
      ttlMs: 45_000,
      bypass: shouldBypassServerCache(req),
      factory: async () => {
        const wards = await getParentWardData(d1, parent.schoolId, parent.userId);
        const wardIds = wards.map((ward) => ward.id).filter(Boolean);
        if (!wardIds.length) {
          return { rankings: [] as Array<{ studentId: string; term: number; classId: string; averageScore: number; rank: number }> };
        }

        const markRows = await d1
          .select({
            studentId: dailyMarks.studentId,
            classId: dailyMarks.classId,
            score: dailyMarks.score,
            termNumber: terms.termNumber,
          })
          .from(dailyMarks)
          .innerJoin(terms, eq(dailyMarks.termId, terms.id))
          .where(
            and(
              eq(dailyMarks.schoolId, parent.schoolId),
              eq(dailyMarks.isDeleted, false),
              inArray(dailyMarks.studentId, wardIds)
            )
          );

        const totalsByStudent = new Map<string, { total: number; count: number; classId: string; term: number }>();
        for (const row of markRows) {
          if (termNumberFilter > 0 && row.termNumber !== termNumberFilter) continue;
          const current = totalsByStudent.get(row.studentId) || {
            total: 0,
            count: 0,
            classId: row.classId,
            term: row.termNumber,
          };
          current.total += Number(row.score) || 0;
          current.count += 1;
          current.classId = row.classId;
          current.term = row.termNumber;
          totalsByStudent.set(row.studentId, current);
        }

        const rankings = [...totalsByStudent.entries()]
          .map(([studentId, stats]) => ({
            studentId,
            term: stats.term,
            classId: stats.classId,
            averageScore: stats.count ? Number((stats.total / stats.count).toFixed(2)) : 0,
          }))
          .sort((a, b) => b.averageScore - a.averageScore)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        return { rankings };
      },
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("Parent class ranking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch class ranking" },
      { status: 500 }
    );
  }
}