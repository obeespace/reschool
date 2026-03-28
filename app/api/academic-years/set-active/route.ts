import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
import { and, asc, eq } from "drizzle-orm";
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

    const { academicYearId } = await req.json();
    if (!academicYearId) {
      return NextResponse.json({ error: "Academic year ID is required" }, { status: 400 });
    }

    const now = new Date();
    await d1.update(sessions).set({ isCurrent: false, updatedAt: now }).where(eq(sessions.schoolId, admin.schoolId));
    await d1.update(terms).set({ isCurrent: false, updatedAt: now }).where(eq(terms.schoolId, admin.schoolId));

    const activated = await d1
      .update(sessions)
      .set({ isCurrent: true, updatedAt: now })
      .where(and(eq(sessions.id, academicYearId), eq(sessions.schoolId, admin.schoolId)))
      .returning({ id: sessions.id, year: sessions.year, isCurrent: sessions.isCurrent });

    if (!activated.length) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    const firstTerm = await d1
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.sessionId, academicYearId)))
      .orderBy(asc(terms.termNumber))
      .limit(1);

    if (firstTerm.length) {
      await d1.update(terms).set({ isCurrent: true, updatedAt: now }).where(eq(terms.id, firstTerm[0].id));
    }

    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`reports:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:dashboard:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`parents:class-ranking:${admin.schoolId}:`);

    return NextResponse.json({
      message: "Active academic year updated",
      academicYear: {
        id: activated[0].id,
        name: activated[0].year,
        isActive: activated[0].isCurrent,
      },
    });
  } catch (error: unknown) {
    console.error("Set active academic year error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active academic year" },
      { status: 500 }
    );
  }
}