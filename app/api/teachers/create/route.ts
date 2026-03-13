import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { users } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const rows = await d1
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.id, teacher.userId), eq(users.schoolId, teacher.schoolId)))
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        _id: rows[0].id,
        fullName: rows[0].name,
        email: rows[0].email,
        classTeacherOf: null,
        subjectsAndClasses: [],
      },
      warning: "Teacher assignment data is pending D1 migration.",
    });
  } catch (error: unknown) {
    console.error("Fetch teacher profile error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
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

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Full name, valid email, and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const existing = await d1
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, admin.schoolId), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const teacherId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await d1.insert(users).values({
      id: teacherId,
      schoolId: admin.schoolId,
      name: fullName,
      email,
      passwordHash,
      role: "TEACHER",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: "Teacher created successfully",
      teacher: {
        _id: teacherId,
        id: teacherId,
        fullName,
        email,
        profile: {
          classTeacherOf: null,
          subjectsAndClasses: [],
        },
      },
      warning: "Class-teacher and subject assignments are pending D1 migration.",
    });
  } catch (error: unknown) {
    console.error("Create teacher error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create teacher" },
      { status: 500 }
    );
  }
}