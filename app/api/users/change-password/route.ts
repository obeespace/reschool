import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/app/models/User";
import connectDB from "@/app/utils/db";

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const oldPassword = String(body?.oldPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!oldPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "oldPassword and newPassword (min 6 chars) are required" },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(user.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await User.findOne({
      _id: new mongoose.Types.ObjectId(user.userId),
      schoolId: mongoose.isValidObjectId(user.schoolId)
        ? new mongoose.Types.ObjectId(user.schoolId)
        : user.schoolId,
    })
      .select("_id passwordHash")
      .lean();

    if (!record) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, record.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: record._id }, { $set: { passwordHash } });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error: unknown) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change password" },
      { status: 500 }
    );
  }
}