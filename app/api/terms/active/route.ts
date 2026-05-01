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

    const activeTerm = await d1
      .select()
      .from(terms)
      .where(and(eq(terms.schoolId, user.schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (!activeTerm.length) {
      return NextResponse.json(
        { error: "No active term found" },
        { status: 404 }
      );
    }

    const session = await d1
      .select({ id: sessions.id, name: sessions.year })
      .from(sessions)
      .where(eq(sessions.id, activeTerm[0].sessionId))
      .limit(1);

    return NextResponse.json({
      term: {
        ...activeTerm[0],
        academicYearId: session[0]
          ? {
              _id: session[0].id,
              name: session[0].name,
            }
          : null,
        termNumber: activeTerm[0].termNumber,
        isActive: activeTerm[0].isCurrent,
      },
      isPaid: activeTerm[0].isPaid,
      isClosed: activeTerm[0].isClosed,
    });
  } catch (error: unknown) {
    console.error("Fetch active term error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch active term",
      },
      { status: 500 }
    );
  }
}