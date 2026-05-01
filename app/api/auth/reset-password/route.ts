import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

type ResetTokenPayload = {
  userId: string;
  schoolId: string;
  purpose: "password_reset";
  iat: number;
  exp: number;
};

export async function POST(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || password.length < 6) {
      return NextResponse.json({ error: "Valid token and password (min 6 chars) are required" }, { status: 400 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let payload: ResetTokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
    } catch {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    if (payload.purpose !== "password_reset") {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    const userRows = await d1
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, payload.userId), eq(users.schoolId, payload.schoolId)))
      .limit(1);

    if (!userRows[0]) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await d1
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password" },
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