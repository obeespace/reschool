import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const admin: any = verifyToken(token || "");

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, message, targetAudience } = await req.json();

  // Validate targetAudience
  const validAudiences = ["ALL", "TEACHERS_AND_PARENTS", "TEACHERS_ONLY", "PARENTS_ONLY"];
  if (!validAudiences.includes(targetAudience)) {
    return NextResponse.json({ 
      error: "Invalid target audience. Must be one of: ALL, TEACHERS_AND_PARENTS, TEACHERS_ONLY, PARENTS_ONLY" 
    }, { status: 400 });
  }

  const announcement = await Announcement.create({
    schoolId: admin.schoolId,
    classId: null, // General announcement
    title,
    message,
    postedBy: admin.userId,
    announcementType: "GENERAL",
    targetAudience
  });

  return NextResponse.json({ 
    success: true,
    announcementId: announcement._id,
    announcement: {
      title: announcement.title,
      message: announcement.message,
      targetAudience: announcement.targetAudience,
      createdAt: announcement.createdAt
    }
  });
}
