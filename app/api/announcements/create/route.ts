import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const classId = String(body?.classId || "").trim();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    if (!classId || !title || !message) return NextResponse.json({ error: "classId, title, and message are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const classExists = await Class.findOne({ _id: new mongoose.Types.ObjectId(classId), schoolId }).lean();
    if (!classExists) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const doc = await Announcement.create({
      schoolId,
      postedBy: new mongoose.Types.ObjectId(teacher.userId),
      announcementType: "CLASS_SPECIFIC",
      targetAudience: "PARENTS_ONLY",
      classId: new mongoose.Types.ObjectId(classId),
      title,
      message,
    });

    return NextResponse.json({ message: "Class announcement created successfully", announcementId: doc._id.toString(), storageMode: "mongodb" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create announcement" }, { status: 500 });
  }
}
