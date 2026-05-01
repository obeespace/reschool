import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const targetAudience = ["TEACHERS_ONLY", "PARENTS_ONLY"].includes(body?.targetAudience) ? body.targetAudience : "ALL";
    if (!title || !message) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });

    await connectDB();
    const doc = await Announcement.create({
      schoolId: new mongoose.Types.ObjectId(admin.schoolId),
      postedBy: new mongoose.Types.ObjectId(admin.userId),
      announcementType: "GENERAL",
      targetAudience,
      classId: null,
      title,
      message,
    });

    return NextResponse.json({ message: "Announcement created successfully", announcementId: doc._id.toString(), storageMode: "mongodb" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create announcement" }, { status: 500 });
  }
}
