import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { terms } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

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

    const body = await req.json().catch(() => ({}));
    const paymentReference = String(body?.paymentReference || "").trim();
    const requestedTermId = String(body?.termId || "").trim();

    if (!paymentReference) {
      return NextResponse.json({ error: "paymentReference is required" }, { status: 400 });
    }

    const termRows = requestedTermId
      ? await d1
          .select({ id: terms.id, termNumber: terms.termNumber, paymentReference: terms.paymentReference })
          .from(terms)
          .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.id, requestedTermId)))
          .limit(1)
      : await d1
          .select({ id: terms.id, termNumber: terms.termNumber, paymentReference: terms.paymentReference })
          .from(terms)
          .where(and(eq(terms.schoolId, admin.schoolId), eq(terms.isCurrent, true)))
          .limit(1);

    if (!termRows[0]) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    if ((termRows[0].paymentReference || "") !== paymentReference) {
      return NextResponse.json({ error: "Payment reference does not match term" }, { status: 400 });
    }

    const now = new Date();
    await d1
      .update(terms)
      .set({ isPaid: true, paymentDate: now, updatedAt: now })
      .where(eq(terms.id, termRows[0].id));

    return NextResponse.json({
      message: "Payment verified successfully",
      term: {
        termId: termRows[0].id,
        termNumber: termRows[0].termNumber,
        paymentReference,
        isPaid: true,
        paymentDate: now,
      },
    });
  } catch (error: unknown) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
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