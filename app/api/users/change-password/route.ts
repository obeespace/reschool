import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    await connectDB();

    // Verify user is authenticated
    const token = req.headers.get("authorization")?.split(" ")[1];
    const payload = verifyToken(token || "");

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Old password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Find user and verify old password
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Old password is incorrect" },
        { status: 401 }
      );
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newPasswordHash;
    await user.save();

    return NextResponse.json({
      message: "Password changed successfully"
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}
