import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const bypassCache = shouldBypassServerCache(req);
    const payload = await getOrSetServerCache({
      key: `academic-years:list:${user.schoolId}`,
      ttlMs: 20_000,
      bypass: bypassCache,
      factory: async () => {
        const [dbSessions, currentTerms] = await Promise.all([
          d1
            .select()
            .from(sessions)
            .where(eq(sessions.schoolId, user.schoolId))
            .orderBy(desc(sessions.startDate)),
          d1
            .select({ sessionId: terms.sessionId, termNumber: terms.termNumber })
            .from(terms)
            .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true))),
        ]);

        const currentTermBySession = new Map(
          currentTerms.map((term) => [term.sessionId, term.termNumber])
        );

        return {
          academicYears: dbSessions.map((session) => ({
            id: session.id,
            name: session.year,
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: session.isCurrent,
            term: currentTermBySession.get(session.id) ?? 1,
          })),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    console.error("Fetch academic years error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch academic years",
      },
      { status: 500 }
    );
  }
}