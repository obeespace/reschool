import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

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

    const activeTerm = await d1
      .select({ termNumber: terms.termNumber, sessionId: terms.sessionId })
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

    return NextResponse.json({
      wards: [],
      stats: {
        wardsCount: 0,
        activeTerm:
          activeTerm[0] && activeSession[0]
            ? `${activeSession[0].year} T${activeTerm[0].termNumber}`
            : "N/A",
        reportsAvailable: 0,
      },
      warning: "Parent-ward linking and reports are pending D1 migration.",
    });
  } catch (error: unknown) {
    console.error("Parent dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch parent dashboard" },
      { status: 500 }
    );
  }
}