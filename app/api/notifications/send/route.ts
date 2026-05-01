import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Notification from "@/app/models/Notification";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const type = String(body?.type || "GENERAL").trim().toUpperCase();
    const actionUrl = String(body?.actionUrl || "").trim();
    const priority = String(body?.priority || "NORMAL").trim().toUpperCase();
    const recipientRole = String(body?.recipientRole || "").trim().toUpperCase();
    const recipientIds: string[] = Array.isArray(body?.recipientIds)
      ? body.recipientIds.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];
    if (!title || !message) return NextResponse.json({ error: "title and message are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const recipientQuery: object = recipientIds.length
      ? { schoolId, _id: { $in: recipientIds.map((id) => new mongoose.Types.ObjectId(id)) } }
      : recipientRole
        ? { schoolId, role: recipientRole }
        : null!;

    if (!recipientQuery) return NextResponse.json({ error: "No matching recipients found" }, { status: 404 });

    const recipients = await User.find(recipientQuery).select("_id role").lean();
    if (!recipients.length) return NextResponse.json({ error: "No matching recipients found" }, { status: 404 });

    const now = new Date();
    await Notification.insertMany(
      recipients.map((r) => ({
        schoolId,
        recipientId: r._id,
        recipientRole: r.role,
        type,
        title,
        message,
        actionUrl: actionUrl || undefined,
        deliveryChannels: ["IN_APP"],
        deliveredAt: now,
        priority,
        createdDate: now,
      }))
    );

    return NextResponse.json({ message: "Notifications sent", recipients: recipients.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send notifications" }, { status: 500 });
  }
}
