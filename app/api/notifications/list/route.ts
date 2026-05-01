import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

/**
 * List Notifications API
 * Retrieve notifications for logged-in user with filtering & pagination
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type"); // Filter by notification type
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    const query: any = { recipientId: user.id };

    if (unreadOnly) {
      query.readAt = null;
    }

    if (type) {
      query.type = type;
    }

    // Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ sentAt: -1 }) // Newest first
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: user.id,
      readAt: null
    });

    return NextResponse.json({
      notifications: notifications.map((notif: any) => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        actionUrl: notif.actionUrl,
        priority: notif.priority,
        isRead: !!notif.readAt,
        sentAt: notif.sentAt,
        readAt: notif.readAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error: any) {
    console.error("List notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
