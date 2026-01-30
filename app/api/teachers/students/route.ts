import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Student from "@/app/models/Students";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token || "");

    if (!user || user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profile = await TeacherProfile.findOne({ userId: user.userId })
      .populate("classTeacherOf", "level arm")
      .lean();

    if (!profile?.classTeacherOf) {
      return NextResponse.json({ classTeacherOf: null, students: [] });
    }

    const classTeacherOf = profile.classTeacherOf as any;

    const students = await Student.find({
      schoolId: user.schoolId,
      currentClassId: classTeacherOf._id
    }).lean();

    return NextResponse.json({
      classTeacherOf: {
        _id: classTeacherOf._id,
        level: classTeacherOf.level,
        arm: classTeacherOf.arm,
        name: `${classTeacherOf.level} ${classTeacherOf.arm}`
      },
      students
    });
  } catch (error: any) {
    console.error("Teacher students error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}
