import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { reportCards, sessions, terms } from "@/app/db/schema";
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

    const payload = await getOrSetServerCache({
      key: `parents:dashboard:${parent.schoolId}:${parent.userId}`,
      ttlMs: 45_000,
      bypass: shouldBypassServerCache(req),
      factory: async () => {
        const activeTerm = await d1
          .select({ id: terms.id, termNumber: terms.termNumber, sessionId: terms.sessionId })
          .from(terms)
          .where(and(eq(terms.schoolId, parent.schoolId), eq(terms.isCurrent, true)))
          .limit(1);

        const activeSession = activeTerm[0]
          ? await d1
              .select({ year: sessions.year })
              .from(sessions)
              .where(eq(sessions.id, activeTerm[0].sessionId))
              .limit(1)
          : [];

        const wards = await getParentWardData(d1, parent.schoolId, parent.userId);
        const wardIds = wards.map((ward) => ward.id).filter(Boolean);

        const reportCount = activeTerm[0] && wardIds.length
          ? (
              await d1
                .select({ id: reportCards.id })
                .from(reportCards)
                .where(
                  and(
                    eq(reportCards.schoolId, parent.schoolId),
                    inArray(reportCards.studentId, wardIds),
                    eq(reportCards.termId, activeTerm[0].id)
                  )
                )
            ).length
          : 0;

        return {
          wards,
          stats: {
            wardsCount: wards.length,
            activeTerm:
              activeTerm[0] && activeSession[0]
                ? `${activeSession[0].year} T${activeTerm[0].termNumber}`
                : "N/A",
            reportsAvailable: reportCount,
          },
        };
      },
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("Parent dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch parent dashboard" },
      { status: 500 }
    );
  }
}