import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const oldPassword = String(body?.oldPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!oldPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "oldPassword and newPassword (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const rows = await d1
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, user.userId), eq(users.schoolId, user.schoolId)))
      .limit(1);

    const record = rows[0];
    if (!record) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, record.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await d1
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, user.userId));

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error: unknown) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change password" },
      { status: 500 }
    );
  }
}