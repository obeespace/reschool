import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: any = verifyToken(token || "");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let announcementsQuery: any = { schoolId: user.schoolId };

    // Build query based on user role (same logic as list endpoint)
    if (user.role === "ADMIN") {
      // Admin sees all announcements in their school
      announcementsQuery = { schoolId: user.schoolId };
    } else if (user.role === "TEACHER") {
      announcementsQuery = {
        schoolId: user.schoolId,
        $or: [
          { 
            announcementType: "GENERAL",
            targetAudience: { $in: ["ALL", "TEACHERS_ONLY", "TEACHERS_AND_PARENTS"] }
          },
          { 
            announcementType: "CLASS_SPECIFIC",
            postedBy: user.userId
          }
        ]
      };
    } else if (user.role === "PARENT") {
      const wards = await Student.find({ 
        schoolId: user.schoolId, 
        parentId: user.userId 
      }).select("currentClassId");
      
      const wardClassIds = wards.map((w: any) => w.currentClassId).filter(Boolean);

      announcementsQuery = {
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
      };
    }

    // Get recent announcements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAnnouncements = await Announcement.find({
      ...announcementsQuery,
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate("postedBy", "firstName lastName")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get read status for these announcements
    const readAnnouncements = await AnnouncementRead.find({
      userId: user.userId,
      announcementId: { $in: recentAnnouncements.map(a => a._id) }
    });

    const readIds = new Set(readAnnouncements.map(r => r.announcementId.toString()));

    // Calculate unread count
    const unreadCount = recentAnnouncements.filter(a => !readIds.has(a._id.toString())).length;

    // Format recent announcements
    const formattedAnnouncements = recentAnnouncements.map(a => {
      const isNew = !readIds.has(a._id.toString());
      const timeAgo = getTimeAgo(a.createdAt);

      return {
        id: a._id,
        title: a.title,
        message: a.message,
        isNew,
        postedBy: {
          name: `${a.postedBy.firstName} ${a.postedBy.lastName}`
        },
        timeAgo,
        className: a.classId?.name || null
      };
    });

    return NextResponse.json({ 
      success: true,
      unreadCount,
      recentAnnouncements: formattedAnnouncements
    });
  } catch (error: any) {
    console.error("Error fetching unread count:", error);
    // Return empty data instead of error to prevent UI breaks
    return NextResponse.json({ 
      success: true,
      unreadCount: 0,
      recentAnnouncements: []
    });
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}
