import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import TeacherActivity from "@/app/models/TeacherActivity";
import Class from "@/app/models/Class";
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

  // Verify the class exists and teacher has access to it
  const classDoc = await Class.findOne({ 
    _id: classId, 
    schoolId: teacher.schoolId,
    teacherId: teacher.userId
  });

  if (!classDoc) {
    return NextResponse.json({ 
      error: "Class not found or you don't have permission to post to this class" 
    }, { status: 404 });
  }

  const announcement = await Announcement.create({
    schoolId: teacher.schoolId,
    classId,
    title,
    message,
    postedBy: teacher.userId,
    announcementType: "CLASS_SPECIFIC",
    targetAudience: "PARENTS_ONLY" // Class announcements are only for parents
  });

  await TeacherActivity.create({
    schoolId: teacher.schoolId,
    teacherId: teacher.userId,
    action: "POST_ANNOUNCEMENT"
  });

  return NextResponse.json({ 
    success: true,
    announcementId: announcement._id,
    announcement: {
      title: announcement.title,
      message: announcement.message,
      className: classDoc.name,
      createdAt: announcement.createdAt
    }
  });
}
