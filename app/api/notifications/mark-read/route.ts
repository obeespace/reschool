import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || body?.notificationId || "").trim();
    const markAll = body?.markAll === true;

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const recipientId = new mongoose.Types.ObjectId(user.userId);
    const now = new Date();

    if (markAll) {
      await Notification.updateMany({ schoolId, recipientId, readAt: null }, { $set: { readAt: now } });
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!id) return NextResponse.json({ error: "id is required unless markAll=true" }, { status: 400 });

    await Notification.updateOne({ _id: new mongoose.Types.ObjectId(id), schoolId, recipientId }, { $set: { readAt: now } });
    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark notification" }, { status: 500 });
  }
}
