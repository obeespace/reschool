import { verifyToken, type ITokenPayload } from "@/app/utils/auth";
import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const teacher: ITokenPayload | null = verifyToken(token || "");
    if (!teacher || teacher.role !== "TEACHER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(teacher.schoolId);
    const userId = new mongoose.Types.ObjectId(teacher.userId);

    const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
    return NextResponse.json({
      assignments: {
        classTeacherOf: profile?.classTeacherOf ? profile.classTeacherOf.toString() : null,
        subjectsAndClasses: (profile?.subjectsAndClasses || []).map((e: {subjectId: mongoose.Types.ObjectId; classIds: mongoose.Types.ObjectId[]}) => ({
          subjectId: e.subjectId.toString(),
          classIds: e.classIds.map((id: mongoose.Types.ObjectId) => id.toString()),
        })),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin: ITokenPayload | null = verifyToken(token || "");
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const teacherId = String(body?.teacherId || "").trim();
    if (!teacherId) return NextResponse.json({ error: "teacherId is required" }, { status: 400 });

    await connectDB();
    const schoolId = new mongoose.Types.ObjectId(admin.schoolId);
    const userId = new mongoose.Types.ObjectId(teacherId);

    const update: Record<string, unknown> = {};
    if (body?.classTeacherOf !== undefined) update.classTeacherOf = body.classTeacherOf ? new mongoose.Types.ObjectId(body.classTeacherOf) : null;
    if (Array.isArray(body?.subjectsAndClasses)) {
      update.subjectsAndClasses = body.subjectsAndClasses.map((e: {subjectId: string; classIds: string[]}) => ({
        subjectId: new mongoose.Types.ObjectId(e.subjectId),
        classIds: (e.classIds || []).map((id: string) => new mongoose.Types.ObjectId(id)),
      }));
    }

    await TeacherProfile.findOneAndUpdate({ schoolId, userId }, { $set: update }, { upsert: true });
    return NextResponse.json({ message: "Assignments updated" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update assignments" }, { status: 500 });
  }
}
