import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/app/models/User";
import connectDB from "@/app/utils/db";

type ResetTokenPayload = {
  userId: string;
  schoolId: string;
  purpose: "password_reset";
};

export async function POST(req: Request) {
  try {
    await connectDB();

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

    const query: { email: string; schoolId?: mongoose.Types.ObjectId } = { email };
    if (schoolId && mongoose.isValidObjectId(schoolId)) {
      query.schoolId = new mongoose.Types.ObjectId(schoolId);
    }

    const matched = await User.findOne(query).select("_id schoolId").lean();

    if (!matched) {
      return NextResponse.json({ message: "If the account exists, a reset link was sent." });
    }

    const payload: ResetTokenPayload = {
      userId: String(matched._id),
      schoolId: String(matched.schoolId || ""),
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