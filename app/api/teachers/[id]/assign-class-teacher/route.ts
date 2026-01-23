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
    const { classId } = await req.json();

    // Check if class exists and belongs to the school
    const classDoc = await Class.findOne({ 
      _id: classId, 
      schoolId: admin.schoolId 
    });

    if (!classDoc) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if the class already has a class teacher (excluding current teacher)
    const existingClassTeacher = await TeacherProfile.findOne({
      schoolId: admin.schoolId,
      classTeacherOf: classId,
      userId: { $ne: teacherId } // Exclude current teacher
    }).populate('userId', 'fullName');

    if (existingClassTeacher) {
      const teacherName = (existingClassTeacher as any).userId?.fullName || 'Another teacher';
      return NextResponse.json({ 
        error: `This class already has a class teacher assigned (${teacherName})` 
      }, { status: 400 });
    }

    // Update or create teacher profile
    const teacherProfile = await TeacherProfile.findOneAndUpdate(
      { userId: teacherId, schoolId: admin.schoolId },
      { classTeacherOf: classId },
      { upsert: true, new: true }
    );

    // Update class with teacher ID
    await Class.findByIdAndUpdate(classId, { classTeacherId: teacherId });

    return NextResponse.json({ 
      success: true,
      message: "Class teacher assigned successfully" 
    });
  } catch (error: any) {
    console.error("Assign class teacher error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign class teacher" },
      { status: 500 }
    );
  }
}
