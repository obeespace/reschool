import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";

function asId(value: unknown): string {
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return String(value || "");
}

export async function POST(req: Request) {
  try {
    await connectDB();

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
      ? await User.find({
          email: normalizedEmail,
          schoolId: mongoose.isValidObjectId(normalizedSchoolId)
            ? new mongoose.Types.ObjectId(normalizedSchoolId)
            : normalizedSchoolId,
        })
          .select("_id fullName email role schoolId passwordHash")
          .limit(1)
          .lean()
      : await User.find({ email: normalizedEmail })
          .select("_id fullName email role schoolId passwordHash")
          .limit(2)
          .lean();

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
        userId: asId(user._id),
        role: user.role,
        fullName: user.fullName,
        schoolId: asId(user.schoolId),
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: asId(user._id),
        name: user.fullName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        schoolId: asId(user.schoolId),
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