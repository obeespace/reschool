import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user: ITokenPayload | null = verifyToken(token || "");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(user.schoolId);

    const teacherUsers = await User.find({ schoolId, role: "TEACHER" }).select("_id fullName email").lean();
    const profiles = await TeacherProfile.find({ schoolId }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const teachers = teacherUsers.map((t) => {
      const profile = profileMap.get(t._id.toString());
      return {
        _id: t._id.toString(),
        id: t._id.toString(),
        fullName: t.fullName,
        email: t.email,
        profile: profile
          ? {
              classTeacherOf: profile.classTeacherOf ? { _id: profile.classTeacherOf.toString() } : null,
              subjectsAndClasses: (profile.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
                subjectId: { _id: e.subjectId.toString() },
                classIds: e.classIds.map((id: mongoose.Types.ObjectId) => ({ _id: id.toString() })),
              })),
            }
          : { classTeacherOf: null, subjectsAndClasses: [] },
      };
    });

    return NextResponse.json({ teachers });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch teachers" }, { status: 500 });
  }
}
