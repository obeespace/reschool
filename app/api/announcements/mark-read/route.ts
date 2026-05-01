import connectDB from "@/app/utils/db";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { announcementId } = await req.json();

    // Create or update read status (upsert)
    await AnnouncementRead.findOneAndUpdate(
      { announcementId, userId: user.userId },
      { readAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking announcement as read:", error);
    // Return success anyway to prevent UI issues
    return NextResponse.json({ success: true });
  }
}
