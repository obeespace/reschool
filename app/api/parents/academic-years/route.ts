import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user || (user.role !== "PARENT" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const [sessionRows, termRows] = await Promise.all([
      d1
        .select({
          id: sessions.id,
          year: sessions.year,
          startDate: sessions.startDate,
          endDate: sessions.endDate,
          isCurrent: sessions.isCurrent,
        })
        .from(sessions)
        .where(eq(sessions.schoolId, user.schoolId))
        .orderBy(desc(sessions.startDate)),
      d1
        .select({
          id: terms.id,
          sessionId: terms.sessionId,
          termNumber: terms.termNumber,
          name: terms.name,
          startDate: terms.startDate,
          endDate: terms.endDate,
          isCurrent: terms.isCurrent,
          isClosed: terms.isClosed,
        })
        .from(terms)
        .where(eq(terms.schoolId, user.schoolId))
        .orderBy(asc(terms.termNumber)),
    ]);

    const termsBySession = new Map<string, Array<{
      id: string;
      termNumber: number;
      name: string;
      startDate: Date;
      endDate: Date;
      isCurrent: boolean;
      isClosed: boolean;
    }>>();

    for (const term of termRows) {
      const bucket = termsBySession.get(term.sessionId) || [];
      bucket.push({
        id: term.id,
        termNumber: term.termNumber,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        isCurrent: term.isCurrent,
        isClosed: term.isClosed,
      });
      termsBySession.set(term.sessionId, bucket);
    }

    const academicYears = sessionRows.map((session) => ({
      id: session.id,
      name: session.year,
      startDate: session.startDate,
      endDate: session.endDate,
      isActive: session.isCurrent,
      terms: (termsBySession.get(session.id) || []).sort((a, b) => a.termNumber - b.termNumber),
    }));

    const currentSession = sessionRows.find((session) => session.isCurrent) || null;
    const currentTerm = currentSession
      ? (
          await d1
            .select({ id: terms.id, termNumber: terms.termNumber, name: terms.name })
            .from(terms)
            .where(
              and(
                eq(terms.schoolId, user.schoolId),
                eq(terms.sessionId, currentSession.id),
                eq(terms.isCurrent, true)
              )
            )
            .limit(1)
        )[0] || null
      : null;

    return NextResponse.json({
      academicYears,
      current: currentSession
        ? {
            session: {
              id: currentSession.id,
              name: currentSession.year,
            },
            term: currentTerm,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Parent academic years error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load academic years" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
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