import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import PasswordResetToken from "@/app/models/PasswordResetToken";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email });

    // Always return success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link was sent." });
    }

    // Invalidate previous tokens
    await PasswordResetToken.updateMany(
      { userId: user._id, used: false },
      { $set: { used: true } }
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false
    });

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    // If you configure email, send resetUrl here.
    const isProduction = process.env.NODE_ENV === "production";

    return NextResponse.json({
      message: "If an account exists, a reset link was sent.",
      resetUrl: isProduction ? undefined : resetUrl
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to request password reset" },
      { status: 500 }
    );
  }
}
