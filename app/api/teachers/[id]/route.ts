import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacher = await User.findOne({ schoolId, _id: new mongoose.Types.ObjectId(id), role: "TEACHER" }).lean();
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const profile = await TeacherProfile.findOne({ schoolId, userId: new mongoose.Types.ObjectId(id) }).lean();

    return NextResponse.json({
      teacher: {
        _id: teacher._id.toString(),
        id: teacher._id.toString(),
        fullName: teacher.fullName,
        email: teacher.email,
        profile: profile
          ? {
              classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString() } : null,
              subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
                subjectId: { _id: e.subjectId.toString() },
                classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
              })),
            }
          : { classTeacherOf: null, subjectsAndClasses: [] },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teacher" }, { status: 500 });
  }
}
