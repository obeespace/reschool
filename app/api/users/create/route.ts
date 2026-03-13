import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

type Role = "ADMIN" | "TEACHER" | "PARENT";

function sanitizeRole(value: string): Role | null {
  if (value === "ADMIN" || value === "TEACHER" || value === "PARENT") return value;
  return null;
}

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

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = sanitizeRole(String(body?.role || ""));

    if (!fullName || !email || password.length < 6 || !role) {
      return NextResponse.json(
        {
          error:
            "fullName, valid email, role (ADMIN|TEACHER|PARENT), and password (min 6 chars) are required",
        },
        { status: 400 }
      );
    }

    const existing = await d1
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const now = new Date();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await d1.insert(users).values({
      id: userId,
      schoolId: admin.schoolId,
      name: fullName,
      email,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: userId,
        fullName,
        email,
        role,
      },
      warning:
        role === "PARENT" ? "Ward linkage is pending D1 migration." : undefined,
    });
  } catch (error: unknown) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}