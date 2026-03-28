import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

type ResetTokenPayload = {
  userId: string;
  schoolId: string;
  purpose: "password_reset";
};

export async function POST(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const schoolId = String(body?.schoolId || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const matched = schoolId
      ? await d1
          .select({ id: users.id, schoolId: users.schoolId })
          .from(users)
          .where(and(eq(users.email, email), eq(users.schoolId, schoolId)))
          .limit(1)
      : await d1.select({ id: users.id, schoolId: users.schoolId }).from(users).where(eq(users.email, email)).limit(1);

    if (!matched[0]) {
      return NextResponse.json({ message: "If the account exists, a reset link was sent." });
    }

    const payload: ResetTokenPayload = {
      userId: matched[0].id,
      schoolId: matched[0].schoolId,
      purpose: "password_reset",
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      message: "If the account exists, a reset link was sent.",
      resetUrl,
      expiresInMinutes: 30,
    });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process forgot password request" },
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