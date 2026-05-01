import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms as d1Terms } from "@/app/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getOrSetServerCache, shouldBypassServerCache } from "@/app/utils/serverCache";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const onlyPaid = searchParams.get("onlyPaid") === "true";
    const bypassCache = shouldBypassServerCache(req);

    const payload = await getOrSetServerCache({
      key: `terms:list:${user.schoolId}:${academicYearId || "all"}:${onlyPaid ? "paid" : "all"}`,
      ttlMs: 15_000,
      bypass: bypassCache,
      factory: async () => {
        const whereClauses = [eq(d1Terms.schoolId, user.schoolId)];
        if (academicYearId) {
          whereClauses.push(eq(d1Terms.sessionId, academicYearId));
        }
        if (onlyPaid) {
          whereClauses.push(eq(d1Terms.isPaid, true));
        }

        const dbTerms = await d1
          .select()
          .from(d1Terms)
          .where(and(...whereClauses))
          .orderBy(desc(d1Terms.startDate));

        const sessionIds = [...new Set(dbTerms.map((term) => term.sessionId))];
        const dbSessions = sessionIds.length
          ? await d1
              .select({ id: sessions.id, year: sessions.year })
              .from(sessions)
              .where(inArray(sessions.id, sessionIds))
          : [];

        const sessionMap = new Map(dbSessions.map((session) => [session.id, session.year]));

        return {
          terms: dbTerms.map((term) => {
            const sessionYear = sessionMap.get(term.sessionId);
            return {
              _id: term.id,
              id: term.id,
              schoolId: term.schoolId,
              academicYearId: sessionYear
                ? {
                    _id: term.sessionId,
                    name: sessionYear,
                  }
                : null,
              termNumber: term.termNumber,
              startDate: term.startDate,
              endDate: term.endDate,
              isActive: term.isCurrent,
              isPaid: term.isPaid,
              isClosed: term.isClosed,
              paymentDate: term.paymentDate,
              paymentReference: term.paymentReference,
            };
          }),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    console.error("Fetch terms error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch terms",
      },
      { status: 500 }
    );
  }
}