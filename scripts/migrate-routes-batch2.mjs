import fs from "fs";
import path from "path";

const base = process.cwd();
function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("✅ Written:", rel);
}

// ─── announcements/list ───────────────────────────────────────────────────
write("app/api/announcements/list/route.ts", `
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
`);

// ─── announcements/create ─────────────────────────────────────────────────
write("app/api/announcements/create/route.ts", `
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
`);

// ─── announcements/admin-create ───────────────────────────────────────────
write("app/api/announcements/admin-create/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const targetAudience = ["TEACHERS_ONLY", "PARENTS_ONLY"].includes(body?.targetAudience) ? body.targetAudience : "ALL";
    if (!title || !message) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });

    await connectDB();
    const doc = await Announcement.create({
      schoolId: new mongoose.Types.ObjectId(admin.schoolId),
      postedBy: new mongoose.Types.ObjectId(admin.userId),
      announcementType: "GENERAL",
      targetAudience,
      classId: null,
      title,
      message,
    });

    return NextResponse.json({ message: "Announcement created successfully", announcementId: doc._id.toString(), storageMode: "mongodb" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create announcement" }, { status: 500 });
  }
}
`);

// ─── announcements/mark-read ──────────────────────────────────────────────
write("app/api/announcements/mark-read/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const announcementId = String(body?.announcementId || "").trim();
    if (!announcementId) return NextResponse.json({ error: "announcementId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const exists = await Announcement.findOne({ _id: new mongoose.Types.ObjectId(announcementId), schoolId }).lean();
    if (!exists) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    await AnnouncementRead.findOneAndUpdate(
      { announcementId: new mongoose.Types.ObjectId(announcementId), userId: new mongoose.Types.ObjectId(user.userId) },
      { $set: { readAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ message: "Announcement marked as read", announcementId, storageMode: "mongodb" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark announcement as read" }, { status: 500 });
  }
}
`);

// ─── announcements/unread-count ───────────────────────────────────────────
write("app/api/announcements/unread-count/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Announcement from "@/app/models/Announcements";
import AnnouncementRead from "@/app/models/AnnouncementRead";
import mongoose from "mongoose";

function isVisibleToRole(targetAudience: string, role: ITokenPayload["role"]): boolean {
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
    const userId = new mongoose.Types.ObjectId(user.userId);

    const allAnnouncements = await Announcement.find({ schoolId }).sort({ createdAt: -1 }).lean();
    const visible = allAnnouncements.filter((a) => isVisibleToRole(a.targetAudience, user.role));

    const readDocs = await AnnouncementRead.find({ announcementId: { $in: visible.map((a) => a._id) }, userId }).lean();
    const readSet = new Set(readDocs.map((r) => r.announcementId.toString()));

    const unread = visible.filter((a) => !readSet.has(a._id.toString()));
    return NextResponse.json({
      unreadCount: unread.length,
      recentAnnouncements: unread.slice(0, 5).map((a) => ({ id: a._id.toString(), title: a.title, createdAt: a.createdAt.getTime() })),
      storageMode: "mongodb",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch unread count" }, { status: 500 });
  }
}
`);

// ─── notifications/send ───────────────────────────────────────────────────
write("app/api/notifications/send/route.ts", `
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

    let recipientQuery: object = recipientIds.length
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
`);

// ─── notifications/list ───────────────────────────────────────────────────
write("app/api/notifications/list/route.ts", `
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
`);

// ─── notifications/mark-read ──────────────────────────────────────────────
write("app/api/notifications/mark-read/route.ts", `
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
`);

// ─── parents/list ─────────────────────────────────────────────────────────
write("app/api/parents/list/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const parents = await User.find({ schoolId, role: "PARENT" }).select("_id fullName email").lean();
    const parentIds = parents.map((p) => p._id);

    const wardCounts = parentIds.length
      ? await ParentWardLink.aggregate([
          { $match: { schoolId, parentId: { $in: parentIds } } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ])
      : [];
    const wardCountMap = new Map(wardCounts.map((w) => [w._id.toString(), w.count]));

    return NextResponse.json({
      parents: parents.map((p) => ({
        id: p._id.toString(),
        fullName: p.fullName,
        email: p.email,
        wardCount: wardCountMap.get(p._id.toString()) || 0,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parents" }, { status: 500 });
  }
}
`);

// ─── parents/dashboard ────────────────────────────────────────────────────
write("app/api/parents/dashboard/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import ReportCard from "@/app/models/ReportCard";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const parent: ITokenPayload | null = verifyToken(token || "");
    if (!parent || parent.role !== "PARENT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(parent.schoolId);
    const parentId = new mongoose.Types.ObjectId(parent.userId);

    const activeTerm = await Term.findOne({ schoolId, isActive: true }).lean();
    const activeYear = activeTerm
      ? await AcademicYear.findOne({ schoolId, _id: activeTerm.academicYearId }).lean()
      : null;

    const wardLinks = await ParentWardLink.find({ schoolId, parentId }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);

    const wardStudents = wardIds.length
      ? await Student.find({ schoolId, _id: { $in: wardIds } }).lean()
      : [];

    const classIds = [...new Set(wardStudents.map((s) => s.currentClassId?.toString()).filter(Boolean))];
    const classMap = classIds.length
      ? new Map((await Class.find({ _id: { $in: classIds } }).lean()).map((c) => [c._id.toString(), c]))
      : new Map();

    const wards = wardStudents.map((s) => ({
      id: s._id.toString(),
      fullName: s.fullName,
      admissionNumber: s.admissionNumber,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      className: s.currentClassId ? (classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string } | undefined)
        ? ((classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string })!.level + " " + (classMap.get(s.currentClassId.toString()) as { level?: string; arm?: string })!.arm).trim()
        : null : null,
    }));

    const reportCount =
      activeTerm && wardIds.length
        ? await ReportCard.countDocuments({ schoolId, studentId: { $in: wardIds }, termId: activeTerm._id, approvedBy: { $ne: null } })
        : 0;

    return NextResponse.json({
      wards,
      stats: {
        wardsCount: wards.length,
        activeTerm: activeTerm && activeYear ? \`\${activeYear.name} T\${activeTerm.termNumber}\` : "N/A",
        reportsAvailable: reportCount,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent dashboard" }, { status: 500 });
  }
}
`);

// ─── parents/details ──────────────────────────────────────────────────────
write("app/api/parents/details/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import ParentWardLink from "@/app/models/ParentWardLink";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const parentId = String(searchParams.get("parentId") || "").trim();
    if (!parentId) return NextResponse.json({ error: "parentId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const parentUser = await User.findOne({ schoolId, _id: new mongoose.Types.ObjectId(parentId), role: "PARENT" }).lean();
    if (!parentUser) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

    const wardLinks = await ParentWardLink.find({ schoolId, parentId: new mongoose.Types.ObjectId(parentId) }).lean();
    const wardIds = wardLinks.map((w) => w.studentId);
    const wardStudents = wardIds.length ? await Student.find({ schoolId, _id: { $in: wardIds } }).lean() : [];

    const classIds = wardStudents.map((s) => s.currentClassId).filter(Boolean);
    const classes = classIds.length ? await Class.find({ _id: { $in: classIds } }).lean() : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    return NextResponse.json({
      parent: { id: parentUser._id.toString(), fullName: parentUser.fullName, email: parentUser.email },
      wards: wardStudents.map((s) => {
        const cls = s.currentClassId ? classMap.get(s.currentClassId.toString()) : null;
        return {
          id: s._id.toString(),
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
          className: cls ? \`\${(cls as {level?: string}).level} \${(cls as {arm?: string}).arm}\`.trim() : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch parent details" }, { status: 500 });
  }
}
`);

// ─── sections/route ───────────────────────────────────────────────────────
write("app/api/sections/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const { searchParams } = new URL(req.url);
    const classIdQ = searchParams.get("classId");

    const query: object = classIdQ
      ? { schoolId, _id: new mongoose.Types.ObjectId(classIdQ) }
      : { schoolId };

    const rows = await Class.find(query).lean();
    return NextResponse.json({
      sections: rows.map((c) => ({
        id: c._id.toString(),
        schoolId: c.schoolId.toString(),
        classId: c._id.toString(),
        armId: c._id.toString(),
        name: \`\${c.level} \${c.arm}\`.trim(),
        className: c.level,
        armName: c.arm,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list sections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const level = String(body?.level || body?.classId || "").trim();
    const arm = String(body?.arm || body?.armId || "").trim();
    if (!level || !arm) return NextResponse.json({ error: "level and arm are required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const existing = await Class.findOne({ schoolId, level, arm }).lean();
    if (existing) return NextResponse.json({ error: "Section already exists" }, { status: 409 });

    const doc = await Class.create({ schoolId, level, arm });
    return NextResponse.json({ message: "Section created", section: { id: doc._id.toString(), name: \`\${level} \${arm}\` } }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create section" }, { status: 500 });
  }
}
`);

// ─── class-arms/route ─────────────────────────────────────────────────────
write("app/api/class-arms/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);
    const arms = await Class.distinct("arm", { schoolId });
    return NextResponse.json({ arms: arms.map((name: string) => ({ name })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list class arms" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().toUpperCase();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    // Note: arms in MongoDB are just the arm field on Class docs; we return success
    return NextResponse.json({ message: "Class arm noted", arm: { name } }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create class arm" }, { status: 500 });
  }
}
`);

// ─── admin/stats ──────────────────────────────────────────────────────────
write("app/api/admin/stats/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import Term from "@/app/models/Term";
import AcademicYear from "@/app/models/AcademicYear";
import School from "@/app/models/School";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [school, activeTerm, teachers, parents, students, classes, subjects] = await Promise.all([
      School.findById(schoolId).lean(),
      Term.findOne({ schoolId, isActive: true }).lean(),
      User.countDocuments({ schoolId, role: "TEACHER" }),
      User.countDocuments({ schoolId, role: "PARENT" }),
      Student.countDocuments({ schoolId }),
      Class.countDocuments({ schoolId }),
      Subject.countDocuments({ schoolId }),
    ]);

    const activeYear = activeTerm ? await AcademicYear.findById(activeTerm.academicYearId).lean() : null;

    return NextResponse.json({
      schoolName: (school as {name?: string} | null)?.name || "School",
      stats: { teachers, students, parents, classes, subjects },
      activeTerm: activeTerm
        ? {
            academicYear: activeYear ? (activeYear as {name?: string}).name : "N/A",
            term: activeTerm.termNumber,
            isPaid: activeTerm.isPaid,
            isClosed: activeTerm.isClosed,
            startDate: activeTerm.startDate,
            endDate: activeTerm.endDate,
          }
        : null,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch stats" }, { status: 500 });
  }
}
`);

// ─── admission-settings ───────────────────────────────────────────────────
write("app/api/admission-settings/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const settings = await AdmissionSettings.findOne({ schoolId: new mongoose.Types.ObjectId(user.schoolId) }).lean();
    return NextResponse.json({ settings: settings || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch admission settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const prefix = String(body?.prefix || "").trim();
    const yearFormat = body?.yearFormat;
    const numberLength = Number(body?.numberLength);
    if (!prefix || !["YYYY", "YY"].includes(yearFormat) || !Number.isFinite(numberLength)) {
      return NextResponse.json({ error: "Invalid admission settings payload" }, { status: 400 });
    }

    await connectDB();
    await AdmissionSettings.findOneAndUpdate(
      { schoolId: new mongoose.Types.ObjectId(admin.schoolId) },
      { $set: { prefix, yearFormat, numberLength } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Admission settings saved" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save admission settings" }, { status: 500 });
  }
}
`);

// ─── admin/setup/status ───────────────────────────────────────────────────
write("app/api/admin/setup/status/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import Class from "@/app/models/Class";
import Subject from "@/app/models/Subject";
import AcademicYear from "@/app/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const [teachers, classes, subjects, academicYears] = await Promise.all([
      User.countDocuments({ schoolId, role: "TEACHER" }),
      Class.countDocuments({ schoolId }),
      Subject.countDocuments({ schoolId }),
      AcademicYear.countDocuments({ schoolId }),
    ]);

    const setupComplete = teachers > 0 && classes > 0 && subjects > 0 && academicYears > 0;
    return NextResponse.json({
      setupComplete,
      steps: {
        hasTeachers: teachers > 0,
        hasClasses: classes > 0,
        hasSubjects: subjects > 0,
        hasAcademicYears: academicYears > 0,
      },
      counts: { teachers, classes, subjects, academicYears },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch setup status" }, { status: 500 });
  }
}
`);

// ─── admin/setup/initialize ───────────────────────────────────────────────
write("app/api/admin/setup/initialize/route.ts", `
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Subject from "@/app/models/Subject";
import Class from "@/app/models/Class";
import AcademicYear from "@/app/models/AcademicYear";
import AdmissionSettings from "@/app/models/AdmissionSettings";
import mongoose from "mongoose";

const DEFAULT_SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies", "Civic Education", "Agricultural Science", "Basic Technology", "Home Economics", "Physical Education", "Religious Studies", "French", "Computer Studies"];
const DEFAULT_CLASSES = [
  { level: "JSS1", arm: "A" }, { level: "JSS1", arm: "B" }, { level: "JSS2", arm: "A" }, { level: "JSS2", arm: "B" },
  { level: "JSS3", arm: "A" }, { level: "JSS3", arm: "B" }, { level: "SSS1", arm: "A" }, { level: "SSS1", arm: "B" },
  { level: "SSS2", arm: "A" }, { level: "SSS2", arm: "B" }, { level: "SSS3", arm: "A" }, { level: "SSS3", arm: "B" },
];

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const body = await req.json().catch(() => ({}));

    const tasks = [];

    // Subjects
    const subjectNames: string[] = Array.isArray(body?.subjects) && body.subjects.length > 0 ? body.subjects : DEFAULT_SUBJECTS;
    for (const name of subjectNames) {
      tasks.push(Subject.findOneAndUpdate({ schoolId, name }, { $setOnInsert: { schoolId, name } }, { upsert: true }));
    }

    // Classes
    const classesToCreate: Array<{level: string, arm: string}> = Array.isArray(body?.classes) && body.classes.length > 0 ? body.classes : DEFAULT_CLASSES;
    for (const cls of classesToCreate) {
      tasks.push(Class.findOneAndUpdate({ schoolId, level: cls.level, arm: cls.arm }, { $setOnInsert: { schoolId, level: cls.level, arm: cls.arm } }, { upsert: true }));
    }

    // Academic Year
    if (body?.academicYear) {
      const yearName = String(body.academicYear.name || "").trim();
      if (yearName) {
        tasks.push(AcademicYear.findOneAndUpdate({ schoolId, name: yearName }, { $setOnInsert: { schoolId, name: yearName, isActive: true } }, { upsert: true }));
      }
    }

    // Admission settings
    tasks.push(AdmissionSettings.findOneAndUpdate({ schoolId }, { $setOnInsert: { schoolId, prefix: "ADM", yearFormat: "YYYY", numberLength: 4 } }, { upsert: true }));

    await Promise.all(tasks);

    return NextResponse.json({ message: "School setup initialized successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initialize setup" }, { status: 500 });
  }
}
`);

console.log("\\n✅ Batch 2 done: announcements, notifications, parents, sections, class-arms, admin stats, admission-settings, admin setup");
