import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { sessions, terms } from "@/app/db/schema";
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

    const { termId } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    const targetTerm = await d1
      .select({ id: terms.id, sessionId: terms.sessionId })
      .from(terms)
      .where(and(eq(terms.id, termId), eq(terms.schoolId, admin.schoolId)))
      .limit(1);

    if (!targetTerm.length) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    const now = new Date();
    await d1.update(terms).set({ isCurrent: false, updatedAt: now }).where(eq(terms.schoolId, admin.schoolId));
    await d1.update(sessions).set({ isCurrent: false, updatedAt: now }).where(eq(sessions.schoolId, admin.schoolId));
    await d1.update(terms).set({ isCurrent: true, updatedAt: now }).where(eq(terms.id, termId));
    await d1.update(sessions).set({ isCurrent: true, updatedAt: now }).where(eq(sessions.id, targetTerm[0].sessionId));

    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`academic-years:list:${admin.schoolId}`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);

    return NextResponse.json({ message: "Term activated successfully", termId });
  } catch (error: unknown) {
    console.error("Set active term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active term" },
      { status: 500 }
    );
  }
}