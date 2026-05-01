import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const announcementId = String(body?.announcementId || "").trim();
    if (!announcementId) return NextResponse.json({ error: "announcementId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const exists = await Announcement.findOne({ _id: new mongoose.Types.ObjectId(announcementId), schoolId }).lean();
    if (!exists) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    await AnnouncementRead.findOneAndUpdate(
      { announcementId: new mongoose.Types.ObjectId(announcementId), userId: new mongoose.Types.ObjectId(user.userId) },
      { $set: { readAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ message: "Announcement marked as read", announcementId, storageMode: "mongodb" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark announcement as read" }, { status: 500 });
  }
}
