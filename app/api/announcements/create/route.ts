import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import TeacherActivity from "@/app/models/TeacherActivity";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const teacher: any = verifyToken(token || "");

  if (!teacher || teacher.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { classId, title, message } = await req.json();

  const announcement = await Announcement.create({
    schoolId: teacher.schoolId,
    classId,
    title,
    message,
    postedBy: teacher.id
  });

  await TeacherActivity.create({
    schoolId: teacher.schoolId,
    teacherId: teacher.id,
    action: "POST_ANNOUNCEMENT"
  });

  return NextResponse.json({ announcementId: announcement._id });
}
