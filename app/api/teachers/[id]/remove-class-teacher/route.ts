import connectDB from "@/app/utils/db";
import TeacherProfile from "@/app/models/TeacherProfile";
import Class from "@/app/models/Class";
import { verifyToken } from "@/app/utils/auth";
import { NextResponse } from "next/server";

export async function POST(
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

    // Get teacher profile to find the class
    const teacherProfile = await TeacherProfile.findOne({
      userId: teacherId,
      schoolId: admin.schoolId
    });

    if (teacherProfile?.classTeacherOf) {
      // Remove teacher from class
      await Class.findByIdAndUpdate(teacherProfile.classTeacherOf, { 
        $unset: { classTeacherId: 1 } 
      });
    }

    // Remove class teacher assignment
    await TeacherProfile.findOneAndUpdate(
      { userId: teacherId, schoolId: admin.schoolId },
      { $unset: { classTeacherOf: 1 } }
    );

    return NextResponse.json({ 
      success: true,
      message: "Class teacher removed successfully" 
    });
  } catch (error: any) {
    console.error("Remove class teacher error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove class teacher" },
      { status: 500 }
    );
  }
}
