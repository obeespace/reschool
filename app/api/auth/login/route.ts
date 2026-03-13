import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const { email, password, schoolId } = await req.json();

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedSchoolId =
      typeof schoolId === "string" && schoolId.trim().length > 0
        ? schoolId.trim()
        : null;

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const userRows = normalizedSchoolId
      ? await d1
          .select()
          .from(users)
          .where(and(eq(users.email, normalizedEmail), eq(users.schoolId, normalizedSchoolId)))
          .limit(1)
      : await d1.select().from(users).where(eq(users.email, normalizedEmail)).limit(2);

    if (!normalizedSchoolId && userRows.length > 1) {
      return NextResponse.json(
        { error: "Multiple schools found for this email. Please provide schoolId." },
        { status: 409 }
      );
    }

    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        fullName: user.name,
        schoolId: user.schoolId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        fullName: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}