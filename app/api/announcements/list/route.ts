import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import Student from "@/app/models/Students";
import "@/app/models/Class";
import "@/app/models/User";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();
  const token = req.headers.get("authorization")?.split(" ")[1];
  const user: any = verifyToken(token || "");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let announcements: any[] = [];

  if (user.role === "ADMIN") {
    // Admin can see all announcements
    announcements = await Announcement.find({ schoolId: user.schoolId })
      .populate("postedBy", "firstName lastName role")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(50);

  } else if (user.role === "TEACHER") {
    // Teachers can see:
    // 1. General announcements targeted to ALL or TEACHERS_ONLY or TEACHERS_AND_PARENTS
    // 2. Class announcements for their own classes
    announcements = await Announcement.find({
      schoolId: user.schoolId,
      $or: [
        { 
          announcementType: "GENERAL",
          targetAudience: { $in: ["ALL", "TEACHERS_ONLY", "TEACHERS_AND_PARENTS"] }
        },
        { 
          announcementType: "CLASS_SPECIFIC",
          postedBy: user.userId // Their own class announcements
        }
      ]
    })
      .populate("postedBy", "firstName lastName role")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(50);

  } else if (user.role === "PARENT") {
    // Parents can see:
    // 1. General announcements targeted to ALL or PARENTS_ONLY or TEACHERS_AND_PARENTS
    // 2. Class-specific announcements for classes their wards are in

    // Find all classes their wards are in
    const wards = await Student.find({ 
      schoolId: user.schoolId, 
      parentId: user.userId
    }).select("currentClassId");
    
    const wardClassIds = wards.map(w => w.currentClassId).filter(Boolean);

    announcements = await Announcement.find({
      schoolId: user.schoolId,
      $or: [
        { 
          announcementType: "GENERAL",
          targetAudience: { $in: ["ALL", "PARENTS_ONLY", "TEACHERS_AND_PARENTS"] }
        },
        { 
          announcementType: "CLASS_SPECIFIC",
          classId: { $in: wardClassIds }
        }
      ]
    })
      .populate("postedBy", "firstName lastName role")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(50);
  }

  return NextResponse.json({ 
    success: true,
    announcements: announcements.map(a => ({
      id: a._id,
      title: a.title,
      message: a.message,
      announcementType: a.announcementType,
      targetAudience: a.targetAudience,
      className: a.classId?.name || null,
      postedBy: {
        name: `${a.postedBy.firstName} ${a.postedBy.lastName}`,
        role: a.postedBy.role
      },
      createdAt: a.createdAt
    }))
  });
}
