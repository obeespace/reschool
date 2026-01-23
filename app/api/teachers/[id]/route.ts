import connectDB from "@/app/utils/db";
import User from "@/app/models/User";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const token = req.headers.get("authorization")?.split(" ")[1];
    const admin = verifyToken(token || "");

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: teacherId } = await params;

    // Get user info
    const user = await User.findOne({ 
      _id: teacherId, 
      schoolId: admin.schoolId,
      role: "TEACHER" 
    });

    if (!user) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get teacher profile
    const teacherProfile = await TeacherProfile.findOne({ 
      userId: teacherId,
      schoolId: admin.schoolId 
    })
      .populate("classTeacherOf", "name level arm")
      .populate({
        path: "subjectsAndClasses.subjectId",
        select: "name code"
      })
      .populate({
        path: "subjectsAndClasses.classIds",
        select: "name level arm"
      });

    const teacher = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      classTeacherOf: teacherProfile?.classTeacherOf || null,
      subjectsAndClasses: teacherProfile?.subjectsAndClasses || []
    };

    return NextResponse.json({ teacher });
  } catch (error: any) {
    console.error("Get teacher profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}
