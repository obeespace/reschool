import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);

    const filter: object = unreadOnly
      ? { schoolId: new mongoose.Types.ObjectId(user.schoolId), recipientId: new mongoose.Types.ObjectId(user.userId), readAt: null }
      : { schoolId: new mongoose.Types.ObjectId(user.schoolId), recipientId: new mongoose.Types.ObjectId(user.userId) };

    const notifications = await Notification.find(filter).sort({ createdDate: -1 }).limit(limit).lean();
    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list notifications" }, { status: 500 });
  }
}
