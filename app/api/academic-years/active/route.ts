import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

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

    const activeSession = await d1
      .select()
      .from(sessions)
      .where(and(eq(sessions.schoolId, user.schoolId), eq(sessions.isCurrent, true)))
      .limit(1);

    if (!activeSession.length) {
      return NextResponse.json({
        academicYear: null,
        message: "No active academic year found",
      });
    }

    const activeTerm = await d1
      .select({ termNumber: terms.termNumber })
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, user.schoolId),
          eq(terms.sessionId, activeSession[0].id),
          eq(terms.isCurrent, true)
        )
      )
      .limit(1);

    return NextResponse.json({
      academicYear: {
        _id: activeSession[0].id,
        name: activeSession[0].year,
        startDate: activeSession[0].startDate,
        endDate: activeSession[0].endDate,
        isActive: activeSession[0].isCurrent,
        term: activeTerm[0]?.termNumber ?? 1,
      },
    });
  } catch (error: unknown) {
    console.error("Fetch active academic year error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch active academic year",
      },
      { status: 500 }
    );
  }
}