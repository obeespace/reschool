import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import mongoose from "mongoose";

function isVisibleToRole(targetAudience: string, announcementType: string, role: ITokenPayload["role"]): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER") return targetAudience === "ALL" || targetAudience === "TEACHERS_ONLY";
  return targetAudience === "ALL" || targetAudience === "PARENTS_ONLY";
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const rows = await Announcement.find({ schoolId }).sort({ createdAt: -1 }).lean();

    let parentVisibleClassIds = new Set<string>();
    if (user.role === "PARENT") {
      const wardLinks = await ParentWardLink.find({ schoolId, parentId: new mongoose.Types.ObjectId(user.userId) }).lean();
      const wardIds = wardLinks.map((w) => w.studentId);
      if (wardIds.length > 0) {
        const students = await Student.find({ schoolId, _id: { $in: wardIds } }).lean();
        students.forEach((s) => {
          if (s.currentClassId) parentVisibleClassIds.add(s.currentClassId.toString());
        });
      }
    }

    const filtered = rows.filter((row) => {
      if (!isVisibleToRole(row.targetAudience, row.announcementType, user.role)) return false;
      if (user.role === "PARENT" && row.announcementType === "CLASS_SPECIFIC") {
        if (!row.classId) return false;
        return parentVisibleClassIds.has(row.classId.toString());
      }
      return true;
    });

    const postedByIds = [...new Set(filtered.map((r) => r.postedBy?.toString()).filter(Boolean))];
    const authorRows = postedByIds.length
      ? await User.find({ _id: { $in: postedByIds } }).select("_id fullName role").lean()
      : [];
    const authorMap = new Map(authorRows.map((a) => [a._id.toString(), a]));

    const readDocs = await AnnouncementRead.find({
      announcementId: { $in: filtered.map((r) => r._id) },
      userId: new mongoose.Types.ObjectId(user.userId),
    }).lean();
    const readMap = new Map(readDocs.map((r) => [r.announcementId.toString(), r.readAt]));

    return NextResponse.json({
      announcements: filtered.map((row) => {
        const author = authorMap.get(row.postedBy?.toString() || "");
        return {
          id: row._id.toString(),
          title: row.title,
          message: row.message,
          announcementType: row.announcementType,
          targetAudience: row.targetAudience,
          classId: row.classId ? row.classId.toString() : null,
          className: null,
          createdAt: row.createdAt,
          readAt: readMap.get(row._id.toString()) || null,
          postedBy: {
            id: author?._id.toString() || row.postedBy?.toString() || "system",
            name: author?.fullName || "System",
            role: author?.role || "ADMIN",
          },
        };
      }),
      storageMode: "mongodb",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch announcements" }, { status: 500 });
  }
}
