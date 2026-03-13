import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getOptionalD1Client } from "@/app/db/runtime";
import { schools, sessions, terms, users } from "@/app/db/schema";
import { eq } from "drizzle-orm";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const d1 = getOptionalD1Client();
    if (!d1) {
      return NextResponse.json({ error: "D1 database not configured" }, { status: 503 });
    }

    const body = await req.json();

    const schoolName = String(body?.schoolName || body?.name || "").trim();
    const adminName = String(body?.adminName || body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!schoolName || !adminName || !email || password.length < 6) {
      return NextResponse.json(
        { error: "schoolName, adminName, valid email, and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const existingEmail = await d1.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const schoolId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const termId = crypto.randomUUID();

    const sessionYear = `${now.getFullYear()}/${now.getFullYear() + 1}`;
    const sessionStart = toDate(body?.sessionStartDate) || new Date(now.getFullYear(), 8, 1);
    const sessionEnd = toDate(body?.sessionEndDate) || new Date(now.getFullYear() + 1, 6, 31);
    const termStart = toDate(body?.termStartDate) || sessionStart;
    const termEnd = toDate(body?.termEndDate) || new Date(now.getFullYear(), 11, 20);

    const passwordHash = await bcrypt.hash(password, 10);

    await d1.transaction(async (tx) => {
      await tx.insert(schools).values({
        id: schoolId,
        name: schoolName,
        address: null,
        logoUrl: null,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(users).values({
        id: userId,
        schoolId,
        name: adminName,
        email,
        passwordHash,
        role: "ADMIN",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(sessions).values({
        id: sessionId,
        schoolId,
        year: sessionYear,
        startDate: sessionStart,
        endDate: sessionEnd,
        isCurrent: true,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(terms).values({
        id: termId,
        schoolId,
        sessionId,
        termNumber: 1,
        name: "1st Term",
        startDate: termStart,
        endDate: termEnd,
        isCurrent: true,
        isPaid: true,
        isClosed: false,
        paymentDate: now,
        paymentReference: `REG-${now.getTime()}`,
        createdAt: now,
        updatedAt: now,
      });
    });

    const token = jwt.sign(
      {
        userId,
        role: "ADMIN",
        fullName: adminName,
        schoolId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "School registered successfully",
        school: { id: schoolId, name: schoolName },
        admin: { id: userId, name: adminName, email },
        token,
        user: {
          id: userId,
          name: adminName,
          fullName: adminName,
          email,
          role: "ADMIN",
          schoolId,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("School registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}