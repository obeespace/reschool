import bcrypt from "bcryptjs";
import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import mongoose from "mongoose";

async function buildProfile(schoolId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
  if (!profile) return { classTeacherOf: null, subjectsAndClasses: [] };
  const classTeacherOfId = profile.classTeacherOf ? profile.classTeacherOf.toString() : null;
  let classTeacherOf = null;
  if (classTeacherOfId) {
    const cls = await Class.findById(classTeacherOfId).lean() as {_id: mongoose.Types.ObjectId; level: string; arm: string} | null;
    if (cls) classTeacherOf = { _id: cls._id.toString(), name: `${cls.level} ${cls.arm}`.trim() };
  }
  const subjectsAndClasses = await Promise.all(
    (profile.subjectsAndClasses || []).map(async (entry: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
      subjectId: { _id: entry.subjectId.toString() },
      classIds: entry.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
    }))
  );
  return { classTeacherOf, subjectsAndClasses };
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);
    const profile = await buildProfile(schoolId, userId);
    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const classTeacherOf = body?.classTeacherOf ? String(body.classTeacherOf).trim() : "";
    const subjectsAndClasses = Array.isArray(body?.subjectsAndClasses) ? body.subjectsAndClasses : [];

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json({ error: "Full name, valid email, and password (min 6 chars) are required" }, { status: 400 });
    }

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);

    const existing = await User.findOne({ schoolId, email }).lean();
    if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await User.create({ schoolId, fullName, email, passwordHash, role: "TEACHER" });
    const teacherId = teacher._id;

    // Build TeacherProfile
    const profileData: { schoolId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; classTeacherOf?: mongoose.Types.ObjectId; subjectsAndClasses: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}[] } = {
      schoolId,
      userId: teacherId,
      subjectsAndClasses: [],
    };

    if (classTeacherOf) {
      const classExists = await Class.findOne({ schoolId, _id: new mongoose.Types.ObjectId(classTeacherOf) }).lean();
      if (classExists) {
        // Clear old class teacher assignment
        await TeacherProfile.updateMany({ schoolId, classTeacherOf: new mongoose.Types.ObjectId(classTeacherOf) }, { $unset: { classTeacherOf: "" } });
        profileData.classTeacherOf = new mongoose.Types.ObjectId(classTeacherOf);
      }
    }

    for (const assignment of subjectsAndClasses) {
      const subjectId = String(assignment?.subjectId || "").trim();
      const classIds = Array.isArray(assignment?.classIds) ? assignment.classIds : [];
      if (!subjectId) continue;
      profileData.subjectsAndClasses.push({
        subjectId: new mongoose.Types.ObjectId(subjectId),
        classIds: classIds.map((id: string) => new mongoose.Types.ObjectId(id)).filter(Boolean),
      });
    }

    await TeacherProfile.create(profileData);
    const profile = await buildProfile(schoolId, teacherId);

    return NextResponse.json({
      message: "Teacher created successfully",
      teacher: {
        _id: teacherId.toString(),
        id: teacherId.toString(),
        fullName,
        email,
        profile: { classTeacherOf: profile.classTeacherOf, subjectsAndClasses: profile.subjectsAndClasses },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create teacher" }, { status: 500 });
  }
}
