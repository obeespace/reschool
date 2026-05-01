import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import mongoose from "mongoose";

function isVisibleToRole(targetAudience: string, role: ITokenPayload["role"]): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER") return targetAudience === "ALL" || targetAudience === "TEACHERS_ONLY";
  return targetAudience === "ALL" || targetAudience === "PARENTS_ONLY";
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const userId = new mongoose.Types.ObjectId(user.userId);

    const allAnnouncements = await Announcement.find({ schoolId }).sort({ createdAt: -1 }).lean();
    const visible = allAnnouncements.filter((a) => isVisibleToRole(a.targetAudience, user.role));

    const readDocs = await AnnouncementRead.find({ announcementId: { $in: visible.map((a) => a._id) }, userId }).lean();
    const readSet = new Set(readDocs.map((r) => r.announcementId.toString()));

    const unread = visible.filter((a) => !readSet.has(a._id.toString()));
    return NextResponse.json({
      unreadCount: unread.length,
      recentAnnouncements: unread.slice(0, 5).map((a) => ({ id: a._id.toString(), title: a.title, createdAt: a.createdAt.getTime() })),
      storageMode: "mongodb",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch unread count" }, { status: 500 });
  }
}
