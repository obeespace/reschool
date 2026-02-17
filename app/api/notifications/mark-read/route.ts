import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * Mark Notification as Read API
 * Single notification or batch mark-as-read
 */

export async function POST(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { notificationIds, markAllAsRead } = body;

    let result: any;

    if (markAllAsRead) {
      // Mark all unread notifications as read for this user
      result = await Notification.updateMany(
        { recipientId: user.id, readAt: null },
        { readAt: new Date() }
      );

      return NextResponse.json({
        message: `${result.modifiedCount} notification(s) marked as read`,
        markedCount: result.modifiedCount
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      result = await Notification.updateMany(
        { _id: { $in: notificationIds }, recipientId: user.id },
        { readAt: new Date() }
      );

      return NextResponse.json({
        message: `${result.modifiedCount} notification(s) marked as read`,
        markedCount: result.modifiedCount
      });
    } else {
      return NextResponse.json(
        { error: "notificationIds array or markAllAsRead flag is required" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
