import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AcademicYear from "@/app/models/AcademicYear";
import School from "@/app/models/School";
import Term from "@/app/models/Term";
import User from "@/app/models/User";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    await connectDB();

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

    const existingEmail = await User.findOne({ email }).select("_id").lean();
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const schoolId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const sessionYear = `${now.getFullYear()}/${now.getFullYear() + 1}`;
    const sessionStart = toDate(body?.sessionStartDate) || new Date(now.getFullYear(), 8, 1);
    const sessionEnd = toDate(body?.sessionEndDate) || new Date(now.getFullYear() + 1, 6, 31);
    const termStart = toDate(body?.termStartDate) || sessionStart;
    const termEnd = toDate(body?.termEndDate) || new Date(now.getFullYear(), 11, 20);

    const passwordHash = await bcrypt.hash(password, 10);

    // Use a stable slug to keep compatibility with existing links in the product.
    const slugBase = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "school";
    const domainSlug = `${slugBase}-${schoolId.toString().slice(-6)}`;

    await School.create({
      _id: schoolId,
      name: schoolName,
      domainSlug,
      adminUserId: userId,
    });

    await User.create({
      _id: userId,
      schoolId,
      fullName: adminName,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    });

    const year = await AcademicYear.create({
      schoolId,
      name: sessionYear,
      startDate: sessionStart,
      endDate: sessionEnd,
      isActive: true,
      term: 1,
    });

    await Term.create({
      schoolId,
      academicYearId: year._id,
      termNumber: 1,
      startDate: termStart,
      endDate: termEnd,
      isActive: true,
      isPaid: true,
      isClosed: false,
      paymentDate: now,
      paymentReference: `REG-${now.getTime()}`,
    });

    const token = jwt.sign(
      {
        userId: userId.toString(),
        role: "ADMIN",
        fullName: adminName,
        schoolId: schoolId.toString(),
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "School registered successfully",
        school: { id: schoolId.toString(), name: schoolName },
        admin: { id: userId.toString(), name: adminName, email },
        token,
        user: {
          id: userId.toString(),
          name: adminName,
          fullName: adminName,
          email,
          role: "ADMIN",
          schoolId: schoolId.toString(),
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