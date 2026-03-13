import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { terms } from "@/app/db/schema";
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

    const now = Date.now();
    const updated = await d1
      .update(terms)
      .set({ isClosed: true, isCurrent: false, updatedAt: now })
      .where(and(eq(terms.id, termId), eq(terms.schoolId, admin.schoolId)))
      .returning({ id: terms.id });

    if (!updated.length) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);

    return NextResponse.json({
      message: "Term closed successfully. No further edits allowed.",
      termId: updated[0].id,
    });
  } catch (error: unknown) {
    console.error("Close term error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close term" },
      { status: 500 }
    );
  }
}