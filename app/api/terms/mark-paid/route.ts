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

    const { termId, paymentReference } = await req.json();
    if (!termId) {
      return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
    }

    const now = Date.now();
    const updated = await d1
      .update(terms)
      .set({ isPaid: true, paymentDate: new Date(now), paymentReference: paymentReference || null, updatedAt: now })
      .where(and(eq(terms.id, termId), eq(terms.schoolId, admin.schoolId)))
      .returning({ id: terms.id, termNumber: terms.termNumber, isPaid: terms.isPaid, paymentDate: terms.paymentDate });

    if (!updated.length) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    invalidateServerCacheByPrefix(`terms:list:${admin.schoolId}:`);
    invalidateServerCacheByPrefix(`admin:stats:${admin.schoolId}`);

    return NextResponse.json({
      message: "Term marked as paid successfully",
      term: {
        termId: updated[0].id,
        termNumber: updated[0].termNumber,
        isPaid: updated[0].isPaid,
        paymentDate: updated[0].paymentDate,
      },
    });
  } catch (error: unknown) {
    console.error("Mark term paid error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark term as paid" },
      { status: 500 }
    );
  }
}